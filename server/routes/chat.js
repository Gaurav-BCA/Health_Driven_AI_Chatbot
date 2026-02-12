const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// System Instructions
const SYSTEM_PROMPT = `You are Arogya AI, a safety-first public health assistant.

====================================
CORE PRINCIPLES (NON-NEGOTIABLE)
====================================
1.  **Safety Over Completeness**: If unsure, advise seeing a doctor.
2.  **Awareness Over Diagnosis**: NEVER diagnose. Explain *possibilities* based on guidelines.
3.  **Consistency Over Creativity**: Stick to WHO/Govt of India guidelines.
4.  **Clarity Over Long Explanations**: Be concise. Use bullet points.

====================================
1. RISK TRIAGE ENGINE
====================================
For EVERY user health query, you MUST assess risk and output a classification line.

Levels:
- **LOW RISK** (Green): General awareness, prevention, wellness tips.
- **MEDIUM RISK** (Yellow): Mild symptoms, early warning signs. Needs monitoring.
- **HIGH RISK** (Red): Severe symptoms (e.g., chest pain, difficulty breathing, high fever > 3 days, bleeding). IMMEDIATE DOCTOR VISIT.

*Logic*: Use keyword matching and intent detection.
- High Risk Keywords: "Chest pain", "Can't breathe", "Unconscious", "Bleeding", "High fever", "Severe pain".

====================================
2. HYBRID CHAT MODE
====================================

**SCENARIO A: FIRST RESPONSE to a new health query**
You MUST use this EXACT structure:

**RISK LEVEL: [LOW/MEDIUM/HIGH]**

**1. Overview**
(Brief explanation of the condition/symptom)

**2. Common Symptoms**
(Bullet points from WHO guidelines)

**3. Prevention & Home Care**
(Actionable tips)

**4. What To Do Next**
(Clear instruction: "Monitor for 24h" or "Visit Doctor Immediately")

---

**SCENARIO B: FOLLOW-UP responses**
- Be conversational and empathetic.
- Ask clarifying questions (Duration? Severity? Other symptoms?).
- Keep answers short and direct.

====================================
3. TRUSTED KNOWLEDGE BASE
====================================
- **Source**: ONLY use data from World Health Organization (WHO) and Ministry of Health (Govt of India).
- **Refusal**: If asked about non-health topics (cricket, movies, coding), politely refuse: "I am Arogya AI, designed only for health assistance."
- **Disclaimer**: ALWAYS end with: "⚠️ I am an AI. Consult a doctor for medical advice."

====================================
4. LANGUAGE & ACCESSIBILITY
====================================
- **Language Matching**: ALWAYS respond in the same language as the user's last message.
- **Hindi Support**: If the user speaks Hindi, you MUST translate the entire response, including the structured headers (e.g., use "**जोखिम स्तर**" instead of "RISK LEVEL", "**1. अवलोकन**" instead of "1. Overview", etc.). Ensure the Hindi is natural and polite.
`;

// Helper: Call Groq API
async function generateAIResponse(messages, customSystemPrompt = null) {
    console.log("Calling Groq API...");

    // Prepare messages for Groq
    const sysPrompt = customSystemPrompt !== null ? customSystemPrompt : SYSTEM_PROMPT;

    const groqMessages = [];
    if (sysPrompt) {
        groqMessages.push({ role: "system", content: sysPrompt });
    }

    // Add rest of the messages
    messages.forEach(msg => {
        groqMessages.push({
            role: msg.role === 'model' ? 'assistant' : msg.role,
            content: msg.content
        });
    });

    try {
        const completion = await groq.chat.completions.create({
            messages: groqMessages,
            model: "llama-3.3-70b-versatile", // Using Llama 3.3 70B Versatile
            temperature: 0.7,
            max_tokens: 1000
        });

        return completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    } catch (error) {
        console.error("!!! GROQ API ERROR !!! " + error.message);
        throw error;
    }
}

// Get all chat sessions for a user (with auto-cleanup)
router.get('/history/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // 1. Auto-Cleanup Expired Messages
        const user = await User.findById(userId);
        if (user && user.historyRetention && user.historyRetention !== 'off') {
            const retention = user.historyRetention;
            let cutoff = new Date();

            switch (retention) {
                case '24h': cutoff.setHours(cutoff.getHours() - 24); break;
                case '3d': cutoff.setDate(cutoff.getDate() - 3); break;
                case '7d': cutoff.setDate(cutoff.getDate() - 7); break;
                case '28d': cutoff.setDate(cutoff.getDate() - 28); break;
            }

            // Delete expired messages
            await Message.deleteMany({ userId: userId, timestamp: { $lt: cutoff } });

            // 2. Cleanup: Remove chats that have no messages left (Empty Sessions)
            // Get all chats for this user
            const userChats = await Chat.find({ userId }).select('_id');
            const userChatIds = userChats.map(c => c._id);

            if (userChatIds.length > 0) {
                // Find which of these chats still have at least one message (User or Model)
                const activeSessionIds = await Message.distinct('sessionId', {
                    sessionId: { $in: userChatIds }
                });

                // Filter out the active ones to find empty ones
                // Convert to string for reliable comparison
                const activeSet = new Set(activeSessionIds.map(id => id.toString()));
                const emptyChatIds = userChatIds.filter(id => !activeSet.has(id.toString()));

                if (emptyChatIds.length > 0) {
                    console.log(`Cleaning up ${emptyChatIds.length} empty chat sessions for user ${userId}`);
                    await Chat.deleteMany({ _id: { $in: emptyChatIds } });
                }
            }
        }

        const chats = await Chat.find({ userId: req.params.userId }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        console.error("History Fetch Error:", error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Create a new chat session
router.post('/new', async (req, res) => {
    try {
        const { userId } = req.body;
        const newChat = new Chat({ userId });
        await newChat.save();
        res.json(newChat);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

// Delete a chat session and its messages
router.delete('/:chatId', async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.chatId);
        await Message.deleteMany({ sessionId: req.params.chatId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete chat' });
    }
});

// Send a message (and save to DB)
router.post('/message', async (req, res) => {
    try {
        const { chatId, message, userId } = req.body;

        let chat;
        let isNew = false;
        let messageCount = 0;

        // 1. Get or Create Session
        if (chatId) {
            chat = await Chat.findById(chatId);
        }

        if (!chat) {
            chat = new Chat({ userId: userId || 'guest' });
            await chat.save();
            isNew = true;
        } else {
            messageCount = await Message.countDocuments({ sessionId: chat._id });
        }

        // 2. Save User Message
        const userMsg = new Message({
            sessionId: chat._id,
            userId: userId || 'guest',
            role: 'user',
            content: message
        });
        await userMsg.save();

        // 3. Generate Title (if new)
        if (isNew || messageCount <= 2) {
            try {
                const titlePrompt = `Analyze the following user health query and generate a short, specific title (max 4-5 words) that summarizes the health condition or topic. 
                Examples: "Chest Pain Causes", "Diabetes Management", "Fever Symptoms".
                User Query: "${message}"
                Title:`;
                const promptMsg = [{ role: "user", content: titlePrompt }];
                // Use a minimal system prompt for title generation to avoid "Health Topics Only" refusal
                const aiTitle = await generateAIResponse(promptMsg, "You are a helpful assistant that generates short titles.");
                chat.title = aiTitle?.replace(/["']/g, '').trim() || message.substring(0, 30);
            } catch (err) {
                console.error("Title Generation Failed:", err);
                const fallbackTitle = message.substring(0, 30);
                chat.title = fallbackTitle + (message.length > 30 ? '...' : '');
            }
            await chat.save();
        }

        // 4. Generate AI Response
        let responseText = "I'm sorry, I'm having trouble connecting right now. Please try again later.";

        try {
            // Fetch recent messages for context (Sort DESC to get latest, then reverse)
            const recentMessages = await Message.find({ sessionId: chat._id }).sort({ timestamp: -1 }).limit(10);

            // Reorder to chronological (oldest to newest)
            const sortedMessages = recentMessages.reverse();

            const history = sortedMessages.map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.content
            }));

            // Add instruction for FIRST message response style if count is low
            if (messageCount === 0) {
                // Append to the last user message instead of adding a 'system' role in the middle
                // causing API validation errors.
                if (history.length > 0 && history[history.length - 1].role === 'user') {
                    history[history.length - 1].content += "\n\n(System Note: This is the user's first contact. Be welcoming and structured.)";
                }
            }

            responseText = await generateAIResponse(history);

        } catch (aiError) {
            console.error("AI Service Error:", aiError);
            responseText = "Sorry, I am currently unable to reach the AI service. Your message has been saved.";
        }

        // 5. Save AI Message
        const botMsg = new Message({
            sessionId: chat._id,
            userId: 'ai',
            role: 'model',
            content: responseText
        });
        await botMsg.save();

        chat.updatedAt = new Date();
        await chat.save();

        res.json({ reply: responseText, chatId: chat._id, title: chat.title });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Get a specific chat (Session + Messages)
router.get('/:chatId', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: 'Chat not found' });

        const messages = await Message.find({ sessionId: req.params.chatId }).sort({ timestamp: 1 });

        res.json({ ...chat.toObject(), messages });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load chat' });
    }
});

module.exports = router;
