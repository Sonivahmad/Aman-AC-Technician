// api/chat.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors");

// Initialize CORS
const corsMiddleware = cors({
  origin: "*", // You can restrict this later to your domain
  methods: ["POST"],
});

module.exports = async (req, res) => {
  // Handle CORS
  await new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured in environment.");

    const genAI = new GoogleGenerativeAI(apiKey);

    const { userMessage, conversationHistory, language } = req.body;

    const systemPrompt = `You are AC Assistant, a friendly, professional chatbot for Aman Malik, an AC Technician in Dhawni, Rampur. Respond to ALL messages in ${language}. Keep replies concise. Your primary job is to provide preliminary diagnosis, quotes (₹1800–₹3500), and guide users to the 'Talk to Aman' WhatsApp link for booking or emergency service.`;

    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I will follow all instructions." }] },
      ...conversationHistory.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      { role: "user", parts: [{ text: userMessage }] },
    ];

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent({ contents });
    const text = result.response.text();

    res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Serverless Error:", error);
    res.status(500).json({
      reply: "Sorry, Aman's AI server is busy right now. Please use the 'Talk to Aman' link!",
      error: error.message,
    });
  }
};
