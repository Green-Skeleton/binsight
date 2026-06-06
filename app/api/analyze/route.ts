import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  // Securely check for GEMINI_API_KEY and return 500 if missing
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'API Key Configuration Missing' }, { status: 500 });
  }

  let body: { image?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { image, mimeType } = body;

  if (!image || !mimeType) {
    return Response.json(
      { error: 'Missing required fields: image (base64) and mimeType' },
      { status: 400 }
    );
  }

  try {
    // Initialize with the official unified @google/genai SDK
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a precise, expert waste-sorting and recycling assistant.
Analyze the provided image of household or holiday packaging waste.
You MUST format your entire response as clean, consistent Markdown using EXACTLY these four headers in order:

# 📦 **Identified Object & Material**
Identify what the object is and specify its exact material composition (e.g., Plastic #2 HDPE, Corrugated Cardboard, Aluminum Can, Glass Bottle, Polystyrene Foam).

# ♻️ **Recyclability Status**
State EXACTLY one of these three verdicts in bold on the first line: **YES**, **NO**, or **LOCAL RULES APPLY**.
Then provide one or two sentences explaining why.

# 🧼 **Preparation Steps**
Provide a numbered list of preparation steps (e.g., 1. Rinse thoroughly. 2. Remove adhesive labels. 3. Flatten if applicable.).

# 🌍 **Eco Fact**
Share one quick, specific, motivating environmental fact about recycling or disposing of this exact material type.`;

    // Call gemini-3.5-flash with inlineData payload matching the unified SDK schema
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                data: image,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
    });

    const analysis = response.text;
    if (!analysis) {
      return Response.json({ error: 'Empty response from AI model' }, { status: 502 });
    }

    return Response.json({ analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred during analysis';
    console.error('[BinSight API Error]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
