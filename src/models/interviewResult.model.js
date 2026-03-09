import mongoose from "mongoose";

/*
Question level evaluation
Each question will store:
- question
- user answer
- score
- feedback
- segment based scores
*/

const answerSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },

  answer: {
    type: String,
    required: true
  },

  score: {
    type: Number,
    required: true
  },

  feedback: {
    type: String
  },

  segmentScores: {
    technical: {
      type: Number,
      default: 0
    },

    problemSolving: {
      type: Number,
      default: 0
    },

    communication: {
      type: Number,
      default: 0
    },

    confidence: {
      type: Number,
      default: 0
    }
  }

});


/*
Interview Result Schema
Stores overall interview performance
*/

const interviewResultSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  resumeName: {
    type: String
  },

  totalScore: {
    type: Number,
    required: true
  },

  overallFeedback: {
    type: String
  },

  /*
  Segment level analytics for dashboard graphs
  */

  segmentScores: {

    technical: {
      type: Number,
      default: 0
    },

    problemSolving: {
      type: Number,
      default: 0
    },

    communication: {
      type: Number,
      default: 0
    },

    confidence: {
      type: Number,
      default: 0
    }

  },

  /*
  Question level results
  */

  answers: [answerSchema],

  /*
  For trend graph
  */

  createdAt: {
    type: Date,
    default: Date.now
  }

});

export default mongoose.model("InterviewResult", interviewResultSchema);