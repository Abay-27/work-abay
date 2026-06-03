import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const generateChatResponse = async (
  history: { role: 'user' | 'model'; text: string }[],
  prompt: string,
  model: 'gemini-3.1-pro-preview' | 'gemini-3-flash-preview' | 'gemini-3.1-flash-lite-preview'
) => {
  if (!apiKey) throw new Error("Gemini API key is missing.");
  const chat = ai.chats.create({
    model: model,
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }))
  });
  
  const result = await chat.sendMessage({ message: prompt });
  return result.text;
};

export const generateTTS = async (text: string, voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore') => {
  if (!apiKey) throw new Error("Gemini API key is missing.");
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16') => {
  if (!apiKey) throw new Error("Gemini API key is missing.");
  const operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: aspectRatio
    }
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  // Return the video URL
  return operation.response.generatedVideos[0].video.uri;
};
