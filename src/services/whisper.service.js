import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Transcribe audio using Gemini 2.5 Flash
 */
export async function transcribeAudio(filePath, mimeType = "audio/webm") {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("Audio file not found");
    }

    const audioBuffer = fs.readFileSync(filePath);

    // Optional safety check (prevent extremely large uploads)
    if (audioBuffer.length > 20 * 1024 * 1024) {
      throw new Error("Audio file too large for inline Gemini processing");
    }

    const base64Audio = audioBuffer.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // 🔒 unchanged
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are an accurate speech-to-text transcription engine.
Transcribe the following interview answer exactly as spoken.
Return ONLY the transcript text.
Do not summarize.
Do not explain.
              `,
            },
            {
              inlineData: {
                mimeType,
                data: base64Audio,
              },
            },
          ],
        },
      ],
      temperature: 0,
    });

    // 🔐 Safe extraction (instead of relying only on response.text)
    const transcript =
      response?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join(" ")
        .trim() ||
      response?.text?.trim();

    if (!transcript) {
      throw new Error("Empty transcription returned.");
    }

    return transcript;
  } catch (error) {
    console.error("Gemini 2.5 Flash Transcription Error:", error.message);
    throw new Error("Audio transcription failed");
  }
}