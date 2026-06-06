import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  // Ensure the backend securely accesses process.env.GEMINI_API_KEY
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

    // Strip out base64 prefixes if present (e.g. "data:image/png;base64,")
    let base64DataStringWithoutPrefix = image;
    if (image.includes(';base64,')) {
      base64DataStringWithoutPrefix = image.split(';base64,')[1];
    }

    // Initialize Google Gen AI client exactly as requested
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const systemPrompt = `You are a smart, waste sorting and recycling assistant. Analyze the image of the household or holiday packaging waste provided.
Identify the object, determine its recyclability status, list preparation instructions, and add an eco fact.
You MUST format your output in clean, consistent Markdown using the following exact headers:

# 📦 **Identified Object & Material**
(Describe what the object is and identify its material, e.g., Plastic #2 HDPE, Corrugated Cardboard, Aluminum Can).

# ♻️ **Recyclability Status**
(State clearly in bold: **YES**, **NO**, or **LOCAL RULES APPLY**. Provide a brief explanation of why).

# 🧼 **Preparation Steps**
(Provide a numbered list of steps needed to prepare the item for disposal/recycling, e.g., Wash thoroughly, remove adhesive labels, flatten).

# 🌍 **Eco Fact**
(Provide a quick, motivating environmental fact about this specific material).`;

    // Call the ai.models.generateContent method passing the model 'gemini-3.5-flash'
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        systemPrompt,
        {
          inlineData: {
            data: base64DataStringWithoutPrefix,
            mimeType: mimeType
          }
        }
      ]
    });

    const textResult = response.text || "Failed to analyze image.";
    return NextResponse.json({ result: textResult });
  } catch (error: any) {
    console.error("API Error in analyze route:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during image analysis" },
      { status: 500 }
    );
  }
}
