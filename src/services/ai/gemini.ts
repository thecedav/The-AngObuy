import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateProductDescription = async (title: string, category: string, features: string[]) => {
  if (!ai) return "AI features are currently unavailable. Please check your API key.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Generate a professional and engaging product description for a ${category} item titled "${title}". Key features: ${features.join(', ')}. Keep it concise and optimized for a marketplace.`,
    });
    return response.text || "Failed to generate description.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate description.";
  }
};

export const moderateContent = async (text: string) => {
  if (!ai) return true; // Default to true if AI is unavailable
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analyze the following content for a social marketplace and determine if it is safe, professional, and non-offensive. Respond with only "SAFE" or "UNSAFE". Content: "${text}"`,
    });
    return response.text?.includes("SAFE") ?? true;
  } catch (error) {
    console.error("Gemini Moderation Error:", error);
    return true;
  }
};
