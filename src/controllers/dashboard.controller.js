import InterviewResult from "../models/interviewResult.model.js";

export const getAnalytics = async (req, res) => {
  try {

    const results = await InterviewResult.find({
      userId: req.user._id
    });

    const totalInterviews = results.length;

    const averageScore =
      totalInterviews === 0
        ? 0
        : results.reduce((sum, r) => sum + r.totalScore, 0) /
          totalInterviews;

    const trend = results.map((r) => ({
      date: r.createdAt,
      score: r.totalScore
    }));

    const segmentScores = results.length
      ? results[results.length - 1].segmentScores
      : {};

    res.json({
      totalInterviews,
      averageScore,
      trend,
      segmentScores
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dashboard error" });
  }
};

export const getResults = async (req, res) => {
  try {

    const results = await InterviewResult.find({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    res.json(results);

  } catch (err) {
    res.status(500).json({ message: "Failed to load results" });
  }
};