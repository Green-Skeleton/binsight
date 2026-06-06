import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { image, mimeType } = await req.json();
    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: "API Key Configuration Missing" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Analyze this image of household packaging waste. Provide clear Markdown with headers: 📦 Identified Object & Material, ♻️ Recyclability Status (Clearly YES, NO, or LOCAL RULES), 🧼 Preparation Steps, and 🌍 Eco Fact." },
            {
              inlineData: {
                data: image,
                mimeType: mimeType || "image/jpeg"
              }
            }
          ]
        }
      ]
    });

    return Response.json({ analysis: response.text });
  } catch (error: any) {
    return Response.json({ error: error.message || "Analysis failed" }, { status: 500 });
  }
}