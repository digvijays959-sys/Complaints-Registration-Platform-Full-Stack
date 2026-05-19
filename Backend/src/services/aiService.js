import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateFollowUpQuestion(complaintText) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" }); // Use the latest small model if gemini-2.5-flash-lite is not yet available/documented

  const prompt = `A user has submitted the following complaint: "${complaintText}". 
  Generate exactly one short, relevant follow-up question to get more details from the user. 
  The response should be ONLY the question text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating AI question:", error);
    return "Could you provide more specific details about the issue?";
  }
}
