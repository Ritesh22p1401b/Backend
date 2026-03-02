import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

/* ======================================================
   🔹 Utility: Robust JSON Extractor
====================================================== */
const extractJSON = (text) => {
  try {
    if (!text) throw new Error("Empty response");

    // Remove markdown fences
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Try direct parse first
    try {
      return JSON.parse(cleaned);
    } catch (_) {}

    // Try extracting largest JSON block
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error("Failed to parse Gemini JSON response");
  }
};

/* ======================================================
   🔹 Retry Wrapper (Handles 503 Overload)
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
        model: "gemini-1.5-flash",
        contents: prompt,
        temperature: 0.4,
      })
    );

    const text =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      response?.text;

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

    // Prevent server crash
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
        model: "gemini-1.5-flash",
        contents: prompt,
        temperature: 0.3,
      })
    );

    const text =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      response?.text;

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