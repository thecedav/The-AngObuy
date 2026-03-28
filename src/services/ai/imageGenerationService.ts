import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateCategoryImage(category: string, description: string) {
  const prompt = `Realistic photography, high definition, vibrant colors, African context. Black African people only. Simple, clear focus, easy to identify. Neutral or lightly contextual background. Single main focus. No visual clutter. Central framing. High definition. Category: ${category}. Description: ${description}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      },
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0 || !candidates[0].content?.parts) {
    return null;
  }

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
