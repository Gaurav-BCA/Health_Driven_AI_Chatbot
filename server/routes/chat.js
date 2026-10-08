const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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
1. RISK TRIAGE ENGINE (STRICT ACCURATE EVALUATION)
====================================
For EVERY user health query, you MUST assess clinical severity and start your response with an exact classification line:
- **RISK LEVEL: HIGH** (or **जोखिम स्तर: उच्च** in Hindi)
- **RISK LEVEL: MEDIUM** (or **जोखिम स्तर: मध्यम** in Hindi)
- **RISK LEVEL: LOW** (or **जोखिम स्तर: कम** in Hindi)

Categorization Guidelines:
- **HIGH RISK** (Red Alert):
  - Emergency / Severe Symptoms: Chest pain, difficulty breathing / shortness of breath, sudden numbness, high fever >3 days, severe bleeding, retro-orbital pain with bleeding/platelet drop, coughing blood, severe abdominal pain, unconsciousness.
  - Action: Recommend IMMEDIATE Doctor / Emergency Visit.
- **MEDIUM RISK** (Yellow Warning):
  - Infectious Diseases & Moderate Symptoms: **Dengue**, **Malaria**, **Tuberculosis**, **Typhoid**, **Cholera**, fever (1-2 days), joint/muscle pain, persistent cough, vomiting, diarrhea, diabetes symptom check, blood pressure concerns.
  - MANDATORY RULE: ANY query regarding Dengue, Malaria, or infectious tropical diseases MUST be classified as at least **MEDIUM RISK** (or **HIGH RISK** if severe symptoms are present). NEVER classify Dengue or Malaria as LOW RISK.
  - Action: Recommend Medical Evaluation within 24-48 hours.
- **LOW RISK** (Green Safe):
  - General Healthy Lifestyle & Hygiene: Purely general wellness queries like hand washing technique, daily water intake, basic nutrition/diet, stretching exercises, sleep hygiene when NO disease or illness is mentioned.
  - Action: Provide educational preventive advice.

====================================
2. HYBRID CHAT MODE
====================================

**SCENARIO A: FIRST RESPONSE to a new health query**
You MUST start with this EXACT first line:

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

// Helper to extract clean disease or health condition title
function extractHealthTitle(message) {
    if (!message) return null;
    const lower = message.toLowerCase().trim();

    // Ignore conversational closing words
    if (/^(thanks|thank you|ok|okay|got it|bye|hello|hi|yes|no)$/i.test(lower)) {
        return null;
    }

    // Direct keyword mapping for common diseases & health queries
    if (lower.includes("dengue")) return "Dengue Information";
    if (lower.includes("malaria")) return "Malaria Check";
    if (lower.includes("diabetes")) return "Diabetes Care";
    if (lower.includes("chest pain")) return "Chest Pain Evaluation";
    if (lower.includes("fever")) return "Fever Symptoms & Care";
    if (lower.includes("cough") || lower.includes("cold")) return "Respiratory Care";
    if (lower.includes("headache") || lower.includes("migraine")) return "Headache Guidance";
    if (lower.includes("blood pressure") || lower.includes("hypertension")) return "Blood Pressure Management";
    if (lower.includes("tuberculosis") || lower.includes("tb")) return "Tuberculosis Awareness";
    if (lower.includes("cholera") || lower.includes("diarrhea")) return "Digestive Health";

    return null;
}

// Helper: Call Groq API
async function generateAIResponse(messages, customSystemPrompt = null) {
    const sysPrompt = customSystemPrompt !== null ? customSystemPrompt : SYSTEM_PROMPT;

    const groqMessages = [];
    if (sysPrompt) {
        groqMessages.push({ role: "system", content: sysPrompt });
    }

    messages.forEach(msg => {
        groqMessages.push({
            role: msg.role === 'model' ? 'assistant' : msg.role,
            content: msg.content
        });
    });

    try {
        const completion = await groq.chat.completions.create({
            messages: groqMessages,
            model: "qwen/qwen3.8-27b",
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

        // Auto-Cleanup Expired Messages if user has retention setting
        if (mongoose.Types.ObjectId.isValid(userId)) {
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

                await Message.deleteMany({ userId: userId, timestamp: { $lt: cutoff } });

                const userChats = await Chat.find({ userId }).select('_id');
                const userChatIds = userChats.map(c => c._id);

                if (userChatIds.length > 0) {
                    const activeSessionIds = await Message.distinct('sessionId', {
                        sessionId: { $in: userChatIds }
                    });

                    const activeSet = new Set(activeSessionIds.map(id => id.toString()));
                    const emptyChatIds = userChatIds.filter(id => !activeSet.has(id.toString()));

                    if (emptyChatIds.length > 0) {
                        await Chat.deleteMany({ _id: { $in: emptyChatIds } });
                    }
                }
            }
        }

        const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
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
        const newChat = new Chat({ userId: userId || 'guest' });
        await newChat.save();
        res.json(newChat);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

// Delete a chat session and its messages
router.delete('/:chatId', async (req, res) => {
    try {
        if (mongoose.Types.ObjectId.isValid(req.params.chatId)) {
            await Chat.findByIdAndDelete(req.params.chatId);
            await Message.deleteMany({ sessionId: req.params.chatId });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete chat' });
    }
});

// Send a message (and save to DB)
router.post('/message', async (req, res) => {
    try {
        const { chatId, message, userId } = req.body;

        let chat = null;
        let isNew = false;
        let messageCount = 0;

        // 1. Try DB Session Get/Create (With valid ObjectId check)
        try {
            if (mongoose.connection.readyState === 1) {
                if (chatId && mongoose.Types.ObjectId.isValid(chatId)) {
                    chat = await Chat.findById(chatId);
                }

                if (!chat) {
                    chat = new Chat({ userId: userId || 'guest' });
                    await chat.save();
                    isNew = true;
                } else {
                    messageCount = await Message.countDocuments({ sessionId: chat._id });
                }

                // Save User Message
                const userMsg = new Message({
                    sessionId: chat._id,
                    userId: userId || 'guest',
                    role: 'user',
                    content: message
                });
                await userMsg.save();
            }
        } catch (dbErr) {
            console.warn("⚠️ MongoDB Operation Warning:", dbErr.message);
        }

        // 2. Generate Title (ONLY if chat has no valid disease title yet)
        const isTitleMissing = !chat.title || chat.title === 'New Chat' || chat.title === 'Untitled Chat' || chat.title.toLowerCase().includes('not a health query');

        if (chat && (isNew || isTitleMissing)) {
            try {
                const directTitle = extractHealthTitle(message);
                if (directTitle) {
                    chat.title = directTitle;
                } else if (!/^(thanks|thank you|ok|okay|got it|bye|hello|hi)$/i.test(message.trim())) {
                    const titlePrompt = `Extract the main disease, medical condition, or health symptom from this user query into a clean 2 to 4 word title (e.g., "Dengue Guidelines", "Chest Pain Triage", "Malaria Symptoms", "Fever Care"). Do NOT return phrases like "Not a Health Query" or "Thank You". Return ONLY the concise title.
User Query: "${message}"`;
                    const promptMsg = [{ role: "user", content: titlePrompt }];
                    const aiTitle = await generateAIResponse(promptMsg, "You are a medical topic extractor. Output ONLY a 2-4 word disease or health title.");

                    let cleanedTitle = aiTitle?.replace(/["']/g, '').trim();
                    if (cleanedTitle && !cleanedTitle.toLowerCase().includes("not a health query") && !cleanedTitle.toLowerCase().includes("thank")) {
                        chat.title = cleanedTitle;
                    } else {
                        chat.title = message.substring(0, 30);
                    }
                }
                if (mongoose.connection.readyState === 1 && chat.title) await chat.save();
            } catch (err) {
                console.error("Title Generation Failed:", err.message);
            }
        }

        // 3. Generate AI Response
        let responseText = "I'm sorry, I'm having trouble connecting right now. Please try again later.";

        try {
            let history = [{ role: 'user', content: message }];

            // Try fetching recent history if DB connected and session exists
            if (chat && mongoose.connection.readyState === 1) {
                const recentMessages = await Message.find({ sessionId: chat._id }).sort({ timestamp: -1 }).limit(10);
                const sortedMessages = recentMessages.reverse();
                if (sortedMessages.length > 0) {
                    history = sortedMessages.map(m => ({
                        role: m.role === 'model' ? 'assistant' : 'user',
                        content: m.content
                    }));
                }
            }

            if (messageCount === 0 && history.length > 0 && history[history.length - 1].role === 'user') {
                history[history.length - 1].content += "\n\n(System Note: This is the user's first contact. Be welcoming and structured.)";
            }

            responseText = await generateAIResponse(history);

        } catch (aiError) {
            console.error("AI Service Error:", aiError);
            responseText = "Sorry, I am currently unable to reach the AI service. Your message has been saved.";
        }

        // 4. Save AI Message (if DB available)
        try {
            if (chat && mongoose.connection.readyState === 1) {
                const botMsg = new Message({
                    sessionId: chat._id,
                    userId: 'ai',
                    role: 'model',
                    content: responseText
                });
                await botMsg.save();

                chat.updatedAt = new Date();
                await chat.save();
            }
        } catch (dbErr) {
            console.warn("⚠️ Could not save AI message to DB:", dbErr.message);
        }

        const effectiveChatId = chat ? chat._id.toString() : (chatId || 'guest-session');
        const effectiveTitle = chat ? chat.title : message.substring(0, 30);

        res.json({ reply: responseText, chatId: effectiveChatId, title: effectiveTitle });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Get a specific chat (Session + Messages)
router.get('/:chatId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.chatId)) {
            return res.json({ messages: [], title: "New Chat" });
        }
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: 'Chat not found' });

        const messages = await Message.find({ sessionId: req.params.chatId }).sort({ timestamp: 1 });

        res.json({ ...chat.toObject(), messages });
    } catch (error) {
        console.error("Load Chat Error:", error);
        res.status(500).json({ error: 'Failed to load chat' });
    }
});

module.exports = router;
