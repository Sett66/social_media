import { GoogleGenAI, createPartFromBase64 } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * 将 File 转为 base64 字符串
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 根据图片 URL 获取 base64（用于编辑模式下已有图片）
 * 注意：若图片跨域可能失败
 */
async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("无法加载图片");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        resolve({ data: match[2], mimeType: match[1] });
      } else {
        reject(new Error("无法解析图片"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 使用 Gemini 根据图片和用户提示词生成 caption
 * @param imageSource - File 或图片 URL
 * @param userPrompt - 用户输入的提示词，如「强调美食、氛围感」
 * @returns 生成的 caption 文本
 */
export async function generateCaptionWithGemini(
  imageSource: File | string,
  userPrompt?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error("未配置 VITE_GEMINI_API_KEY，请在 .env.local 中设置");
  }

  let base64Data: string;
  let mimeType: string;

  if (imageSource instanceof File) {
    base64Data = await fileToBase64(imageSource);
    mimeType = imageSource.type || "image/jpeg";
  } else {
    const parsed = await urlToBase64(imageSource);
    base64Data = parsed.data;
    mimeType = parsed.mimeType;
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = userPrompt?.trim()
    ? `根据这张图片和用户提供的提示，直接生成一段适合社交媒体的 caption，是能直接发布的，没有其他多余的输出。用户提示：${userPrompt}\n\n请用简洁、自然的语言写一段 caption，长度适中。`
    : "根据这张图片，生成一段适合社交媒体的 caption。请用简洁、自然的语言描述图片内容，长度适中。";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
  });

  const text = response.text;
  if (!text || typeof text !== "string") {
    throw new Error("未能从 AI 获取 caption");
  }
  return text.trim();
}
