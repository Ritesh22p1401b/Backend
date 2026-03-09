import { GoogleGenAI } from "@google/genai";
import InterviewResult from "../models/interviewResult.model.js";

const ai = new GoogleGenAI({});

export const evaluateInterview = async (req, res) => {
  try {

    const { answers, resumeName } = req.body;

    if (!answers || answers.length === 0) {
      return res.status(400).json({
        message: "No answers provided"
      });
    }

    const prompt = `
You are an AI technical interviewer.

Evaluate the following interview answers.

Scoring dimensions:
1. Technical Knowledge
2. Problem Solving
3. Communication
4. Confidence

Rules:
- Score each question out of 10
- Give feedback for each answer
- Calculate overall segment scores

Return ONLY JSON in this format:

{
  "overallScore": number,
  "overallFeedback": "string",

  "segmentScores": {
    "technical": number,
    "problemSolving": number,
    "communication": number,
    "confidence": number
  },

  "answers":[
    {
      "question": "string",
      "score": number,
      "feedback": "string",

      "segmentScores": {
        "technical": number,
        "problemSolving": number,
        "communication": number,
        "confidence": number
      }
    }
  ]
}

Interview Answers:
${JSON.stringify(answers)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const text = response.text;

    // Clean markdown if Gemini returns ```json
    const cleanText = text.replace(/```json|```/g, "").trim();

    const evaluation = JSON.parse(cleanText);

    // Save evaluation in MongoDB
    const result = await InterviewResult.create({

      userId: req.user._id,

      resumeName,

      totalScore: evaluation.overallScore,

      overallFeedback: evaluation.overallFeedback,

      segmentScores: evaluation.segmentScores,

      answers: answers.map((ans, index) => ({
        question: ans.question,
        answer: ans.answer,
        score: evaluation.answers[index]?.score || 0,
        feedback: evaluation.answers[index]?.feedback || "",
        segmentScores: evaluation.answers[index]?.segmentScores || {}
      }))

    });

    res.status(200).json({
      message: "Interview evaluated successfully",
      result
    });

  } catch (error) {

    console.error("Evaluation Error:", error);

    res.status(500).json({
      message: "Interview evaluation failed"
    });

  }
};