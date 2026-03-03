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
 * @param imageSources - 可以是 File 或图片 URL 的数组，或为 undefined
 * @param userPrompt - 用户输入的提示词，如「强调美食、氛围感」
 * @returns 生成的 caption 文本
 */
export async function generateCaptionWithGemini(
  imageSources?: Array<File | string>,
  userPrompt?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error("未配置 VITE_GEMINI_API_KEY，请在 .env.local 中设置");
  }

  // internal helper: normalize a source into {data, mimeType}
  async function normalize(source: File | string) {
    if (source instanceof File) {
      const data = await fileToBase64(source);
      return { data, mimeType: source.type || "image/jpeg" };
    } else {
      return await urlToBase64(source);
    }
  }

  const hasImages = !!(imageSources && imageSources.length > 0);
  const trimmedHint = userPrompt?.trim();
  const prompt = (() => {
    if (hasImages) {
      if (trimmedHint) {
        return `根据这些图片和用户提供的提示，直接生成一段适合社交媒体的 caption，是能直接发布的，没有其他多余的输出。用户提示：${trimmedHint}\n\n请用简洁、自然的语言写一段 caption，长度适中。`;
      }
      return "根据这些图片，生成一段适合社交媒体的 caption。请用简洁、自然的语言描述图片内容，长度适中。";
    }
    // no images
    if (trimmedHint) {
      return `根据用户提供的提示，生成一段适合社交媒体的 caption。用户提示：${trimmedHint}\n\n请用简洁、自然的语言写一段 caption，长度适中。`;
    }
    return "请生成一段适合社交媒体的通用 caption，使用简洁、自然的语言。";
  })();

  // build parts array for model
  const parts: any[] = [{ text: prompt }];
  if (hasImages) {
    for (const src of imageSources!) {
      try {
        const { data, mimeType } = await normalize(src);
        parts.push({ inlineData: { mimeType, data } });
      } catch (err) {
        console.warn("failed to convert image for caption", err);
      }
    }
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  });

  const text = response.text;
  if (!text || typeof text !== "string") {
    throw new Error("未能从 AI 获取 caption");
  }
  return text.trim();
}
