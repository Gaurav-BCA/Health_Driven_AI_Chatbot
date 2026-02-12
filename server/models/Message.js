const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    userId: { type: String, required: true },
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Index for fast retrieval by session
messageSchema.index({ sessionId: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);
