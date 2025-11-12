// api/chat.js
const { GoogleGenAI } = require("@google/genai");
const cors = require('cors');

// Initialize CORS middleware to allow requests from your website
const corsMiddleware = cors({
    origin: '*', // You can change this to your specific domain (e.g., 'https://amanacservices.com')
    methods: ['POST'],
});

module.exports = async (req, res) => {
    // 1. Handle CORS setup
    await new Promise((resolve, reject) => {
        corsMiddleware(req, res, (result) => {
            if (result instanceof Error) return reject(result);
            resolve(result);
        });
    });

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        // 2. Access API Key securely from Vercel's environment variables
        const apiKey = process.env.GEMINI_API_KEY; 
        if (!apiKey) throw new Error("API Key not configured.");
        
        const ai = new GoogleGenAI({ apiKey });

        // 3. Get data from the frontend
        const { userMessage, conversationHistory, language } = req.body;
        
        // --- System Prompt (The AI's Personality) ---
        const systemPrompt = `You are AC Assistant, a friendly, professional chatbot for Aman Malik, an AC Technician in Dhawni, Rampur. Respond to ALL messages in ${language}. Keep replies concise. Your primary job is to provide preliminary diagnosis, quotes (e.g., ₹1800-₹3500), and guide users to the 'Talk to Aman' WhatsApp link for booking or emergency service, as you cannot book appointments yourself.`;

        // 4. Construct the full message history for context
        const contents = [
            { role: "user", parts: [{ text: systemPrompt }] }, 
            { role: "model", parts: [{ text: "Understood. I will follow all instructions." }] }, 
            
            // Map the history structure from frontend to Gemini format
            ...conversationHistory.map(msg => ({ 
                role: msg.sender === 'user' ? 'user' : 'model', 
                parts: [{ text: msg.content }] 
            })),
            
            // Add the current user message
            { role: "user", parts: [{ text: userMessage }] }
        ];

        // 5. Call the Gemini API (using the free-tier model)
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: contents,
            config: { temperature: 0.6 }
        });

        // 6. Send the AI's text response back to your website
        res.status(200).json({ reply: response.text });

    } catch (error) {
        console.error("Serverless Error:", error);
        res.status(500).json({ 
            reply: `Sorry, Aman's AI server is busy right now. Please use the 'Talk to Aman' link!`,
            error: error.message
        });
    }
};