const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate a random UID if needed or use _id
        // For compatibility with previous schema which required uid, we can generate a simple one
        const uid = 'local_' + Date.now() + Math.random().toString(36).substr(2, 9);

        const newUser = new User({
            name,
            email,
            mobile,
            password: hashedPassword,
            uid
        });

        await newUser.save();

        // Create JWT Token
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, name: newUser.name },
            process.env.JWT_SECRET || 'fallback_secret_key', // Ensure to add JWT_SECRET to .env
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                name: newUser.name,
                email: newUser.email,
                id: newUser._id,
                uid: newUser.uid,
                historyRetention: newUser.historyRetention || 'off'
            }
        });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ error: 'Internal server error during signup' });
    }
});

// Signin
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Check password (only if user has a password set - i.e. local auth)
        if (!user.password) {
            return res.status(400).json({ error: 'This account might be linked to a social login. Please try that method.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Create JWT Token
        const token = jwt.sign(
            { id: user._id, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                name: user.name,
                email: user.email,
                id: user._id,
                uid: user.uid,
                historyRetention: user.historyRetention || 'off'
            }
        });

    } catch (error) {
        console.error('Signin Error:', error);
        res.status(500).json({ error: 'Internal server error during signin' });
    }
});

// Update User Settings
router.put('/settings', async (req, res) => {
    try {
        const { userId, historyRetention } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (historyRetention) {
            user.historyRetention = historyRetention;
        }

        await user.save();

        res.json({
            message: 'Settings updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                historyRetention: user.historyRetention
            }
        });

    } catch (error) {
        console.error('Settings Update Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
