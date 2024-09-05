const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// const app = express();
// app.use(express.json());

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