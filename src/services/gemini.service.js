import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/* ======================================================
   🔹 Safe Text Extraction (Aligned with whisper.service)
====================================================== */
const extractText = (response) => {
  return (
    response?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join(" ")
      .trim() || ""
  );
};

/* ======================================================
   🔹 Robust JSON Extractor
====================================================== */
const extractJSON = (text) => {
  try {
    if (!text) throw new Error("Empty response");

    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (_) {}

    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("No JSON found in Gemini response");
    }

    return JSON.parse(match[0]);
  } catch (error) {
    throw new Error("Failed to parse Gemini JSON response");
  }
};

/* ======================================================
   🔹 Retry Wrapper (Handles 503)
====================================================== */
const withRetry = async (fn, retries = 2) => {
  try {
    return await fn();
  } catch (error) {
    if (
      retries > 0 &&
      (error?.status === 503 ||
        error?.message?.includes("UNAVAILABLE"))
    ) {
      console.log("Gemini overloaded. Retrying...");
      await new Promise((res) => setTimeout(res, 2000));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
};

/* ======================================================
   1️⃣ Generate Resume-Based Interview Questions
====================================================== */
export const generateQuestions = async (resumeText) => {
  try {
    if (!resumeText || resumeText.length < 50) {
      throw new Error("Resume text too short");
    }

    const prompt = `
You are a senior technical interviewer.

STRICT RULES:
- Questions must reference tools, frameworks, or projects mentioned in the resume.
- Do NOT ask generic questions.
- Do NOT number the questions.
- Return ONLY valid JSON.
- Do NOT include markdown or explanation.

Return EXACT format:

{
  "technical": ["", "", "", "", ""],
  "project": ["", "", ""],
  "behavioral": ["", ""]
}

Resume:
${resumeText}
`;

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        temperature: 0.4,
      })
    );

    const text = extractText(response);

    if (!text) {
      throw new Error("Empty Gemini response");
    }

    const parsed = extractJSON(text);

    return {
      technical: Array.isArray(parsed.technical)
        ? parsed.technical.slice(0, 5)
        : [],
      project: Array.isArray(parsed.project)
        ? parsed.project.slice(0, 3)
        : [],
      behavioral: Array.isArray(parsed.behavioral)
        ? parsed.behavioral.slice(0, 2)
        : [],
    };
  } catch (error) {
    console.error("Gemini Question Generation Error:", error.message);

    return {
      technical: [],
      project: [],
      behavioral: [],
    };
  }
};

/* ======================================================
   2️⃣ Evaluate Candidate Answer
====================================================== */
export const evaluateAnswer = async (question, transcript) => {
  try {
    if (!transcript || transcript.trim().length < 5) {
      return {
        score: 0,
        feedback: "No meaningful answer detected.",
        breakdown: {
          technicalAccuracy: 0,
          communication: 0,
          confidence: 0,
          relevance: 0,
        },
      };
    }

    const prompt = `
You are an expert AI interviewer.

Evaluate the candidate's answer.

Question:
${question}

Candidate Answer:
${transcript}

Return ONLY valid JSON:

{
  "score": number,
  "feedback": "short paragraph feedback",
  "breakdown": {
    "technicalAccuracy": number,
    "communication": number,
    "confidence": number,
    "relevance": number
  }
}
`;

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        temperature: 0.3,
      })
    );

    const text = extractText(response);

    if (!text) throw new Error("Empty Gemini response");

    const parsed = extractJSON(text);

    return {
      score:
        typeof parsed.score === "number"
          ? Math.max(0, Math.min(10, parsed.score))
          : 0,
      feedback: parsed.feedback || "No feedback generated.",
      breakdown: {
        technicalAccuracy: parsed.breakdown?.technicalAccuracy ?? 0,
        communication: parsed.breakdown?.communication ?? 0,
        confidence: parsed.breakdown?.confidence ?? 0,
        relevance: parsed.breakdown?.relevance ?? 0,
      },
    };
  } catch (error) {
    console.error("Gemini Evaluation Error:", error.message);

    return {
      score: 0,
      feedback: "AI evaluation failed.",
      breakdown: {
        technicalAccuracy: 0,
        communication: 0,
        confidence: 0,
        relevance: 0,
      },
    };
  }
};