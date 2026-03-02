import fs from "fs";
import pdfParse from "pdf-parse";

export const extractResumeText = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("File does not exist");
    }

    const buffer = fs.readFileSync(filePath);

    const data = await pdfParse(buffer);

    if (!data.text || data.text.trim().length < 20) {
      throw new Error("PDF contains no readable text");
    }

    return data.text.trim();
  } catch (error) {
    console.error("PDF Parsing Error:", error.message);
    throw new Error("Failed to parse PDF");
  }
};