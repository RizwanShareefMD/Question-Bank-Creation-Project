require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function extractText(file) {
    const dataBuffer = fs.readFileSync(file.path);
    if (file.mimetype === "application/pdf") {
        const data = await pdf(dataBuffer);
        return data.text;
    } else {
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        return result.value;
    }
}

app.post("/upload-and-generate", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file" });
        const text = await extractText(req.file);
        fs.unlinkSync(req.file.path);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Create ${req.body.num_questions || 5} MCQs from this text: ${text.substring(0, 15000)}. Difficulty: ${req.body.difficulty || "medium"}. Return ONLY JSON with structure: { "questions": [ { "question": "", "options": ["", "", "", ""], "correct_answer": "", "explanation": "" } ] }`;
        const result = await model.generateContent(prompt);
        let jsonText = (await result.response).text().replace(/```json|```/g, "").trim();
        res.json(JSON.parse(jsonText));
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});

app.listen(8000, () => console.log("Server running on port 8000"));
