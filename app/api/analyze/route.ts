import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  // Graceful handling of missing API key with a 500 JSON error
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API Key Configuration Missing" },
      { status: 500 }
    );
  }

  try {
    const { image, mimeType } = await req.json();
    if (!image || !mimeType) {
      return NextResponse.json(
        { error: "Missing image or mimeType in request body" },
        { status: 400 }
      );
    }

    // Strip base64 metadata prefix if present so inlineData receives pure base64
    let base64Data = image;
    if (image.includes(';base64,')) {
      base64Data = image.split(';base64,')[1];
    }

    // Official unified @google/genai library initialization
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Structured system prompt to enforce markdown formatting
    const systemPrompt = `You are a strict, expert waste sorting assistant. Analyze the provided image of packaging waste.
You MUST format your output exactly as clean, consistent Markdown using the following headers:

# 📦 **Identified Object & Material**
(Identify the object and its material, e.g., Plastic #2 HDPE, Corrugated Cardboard).

# ♻️ **Recyclability Status**
(State clearly in bold exactly one of: **YES**, **NO**, or **LOCAL RULES APPLY**. Explain briefly).

# 🧼 **Preparation Steps**
(Provide a numbered list of steps to prepare the item, e.g., wash thoroughly, remove adhesive labels).

# 🌍 **Eco Fact**
(A quick, motivating environmental fact about this specific material).`;

    // Target the fast gemini-3.5-flash model using inlineData schema
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        systemPrompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ]
    });

    const textResult = response.text || "Failed to generate analysis.";
    return NextResponse.json({ result: textResult });
    
  } catch (error: any) {
    console.error("API Error in analyze route:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during image analysis" },
      { status: 500 }
    );
  }
}
