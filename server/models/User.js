const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    uid: { type: String, unique: true }, // Optional for local auth, or generate one
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String }, // Optional or required based on new flow
    password: { type: String }, // Required for local auth
    historyRetention: {
        type: String,
        enum: ['24h', '3d', '7d', '28d', 'off'],
        default: 'off'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
