const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const dotenv = require('dotenv');
const pino = require('pino');  // Import Pino logger
dotenv.config();

// const app = express();
// app.use(express.json());

const logger = pino();  // Create a Pino logger instance

router.post('/register', async(req, res) => {
    try {
        const { email, password } = req.body;
        const db = await connectToDatabase();
        const collection = db.collection("users");
        const existingEmail = await collection.findOne({email: email})
        if (existingEmail) {
            logger.error('Email already exists.');
            return res.status(400).json({ error: "Email already exists."});
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await collection.insertOne({
            email: email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hashedPassword,
            createdAt: new Date(),
        });

        const authtoken = jwt.sign(
            { userId: newUser._id },  // payload
            process.env.JWT_SECRET, // secret key
            {expiresIn: '1h'},      // options
        );
        logger.info("User registered successfully");

        res.json({authtoken, email});

    } catch (error) {
        return res.status(500).send("Internal server error");
    }

});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db =  await connectToDatabase();
        const collection = db.collection("users");
        const user = await collection.findOne( { email: email });
        if (!user) {
            return res.status(400).json( { error: "Invalid email or password" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        const userName = user.firstName;
        const userEmail = user.email;

        // If password match, create a JWT token and send it back to the client
        const token = jwt.sign(
            {userId: user._id},
            process.env.JWT_SECRET,
            {expiresIn: "1h"}
        );

        res.json({
            token,
            message: "Login successful!"
        });

    } catch (error) {
        return res.status(500).send("Internal server error");
    }
});

router.put('/update', async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.error('Validation errors in update request', errors.array());
            return res.send(400).json({ error: errors.array() });
        }
        const email = req.headers.email;
        if(!email) {
            logger.error('Email not found in the request headers');
            return res.send(400).json({error: "Email not found int the request headers"});
        }
        const db = await connectToDatabase();
        const collection = db.collection('users');
        const existingUser = await collection.findOne({ email });
        const updateUser = await collection.findOneAndUpdate(
            {email},
            {$set: existingUser},
            {returnDocument: 'after'}
        );
        const token = jwt.sign(
            {userId:existingUser._id},
            process.env.JWT_SECRET,
            {expiresIn: "1h"}
        );
        

    } catch (error) {
        
    }
});

module.exports = router;