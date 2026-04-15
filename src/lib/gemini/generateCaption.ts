import { GoogleGenAI, createPartFromBase64 } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";

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

  const parts = await buildGeminiParts(imageSources, userPrompt, normalize);

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
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

type StreamStatus = "streaming" | "reconnecting" | "done";

type StreamOptions = {
  imageSources?: Array<File | string>;
  userPrompt?: string;
  onChunk: (chunk: string) => void;
  onStatus?: (status: StreamStatus, attempt: number) => void;
  maxReconnectAttempts?: number;
};

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("timeout") ||
    msg.includes("503") ||
    msg.includes("500") ||
    msg.includes("rate") ||
    msg.includes("unavailable")
  );
}

function mergeContinuationText(currentText: string, nextText: string): string {
  const cleanNext = nextText.trimStart();
  if (!currentText) return cleanNext;
  if (!cleanNext) return "";

  // Avoid duplicated output between reconnection retries
  const maxOverlap = Math.min(currentText.length, cleanNext.length, 80);
  for (let overlap = maxOverlap; overlap > 0; overlap--) {
    if (currentText.endsWith(cleanNext.slice(0, overlap))) {
      return cleanNext.slice(overlap);
    }
  }
  return cleanNext;
}

async function buildGeminiParts(
  imageSources: Array<File | string> | undefined,
  userPrompt: string | undefined,
  normalize: (source: File | string) => Promise<{ data: string; mimeType: string }>
) {
  const hasImages = !!(imageSources && imageSources.length > 0);
  const trimmedHint = userPrompt?.trim();
  const prompt = (() => {
    if (hasImages) {
      if (trimmedHint) {
        return `根据这些图片和用户提供的提示，直接生成一段适合社交媒体的 caption，是能直接发布的，没有其他多余的输出。用户提示：${trimmedHint}\n\n请用简洁、自然的语言写一段 caption，长度适中。`;
      }
      return "根据这些图片，生成一段适合社交媒体的 caption。请用简洁、自然的语言描述图片内容，长度适中。";
    }
    if (trimmedHint) {
      return `根据用户提供的提示，生成一段适合社交媒体的 caption。用户提示：${trimmedHint}\n\n请用简洁、自然的语言写一段 caption，长度适中。`;
    }
    return "请生成一段适合社交媒体的通用 caption，使用简洁、自然的语言。";
  })();

  const parts: Array<{ text: string } | ReturnType<typeof createPartFromBase64>> = [
    { text: prompt },
  ];
  if (!hasImages) return parts;

  for (const src of imageSources!) {
    try {
      const { data, mimeType } = await normalize(src);
      parts.push(createPartFromBase64(data, mimeType));
    } catch (err) {
      console.warn("failed to convert image for caption", err);
    }
  }
  return parts;
}

export async function generateCaptionWithGeminiStream({
  imageSources,
  userPrompt,
  onChunk,
  onStatus,
  maxReconnectAttempts = 2,
}: StreamOptions): Promise<string> {
  if (!apiKey) {
    throw new Error("未配置 VITE_GEMINI_API_KEY，请在 .env.local 中设置");
  }

  async function normalize(source: File | string) {
    if (source instanceof File) {
      const data = await fileToBase64(source);
      return { data, mimeType: source.type || "image/jpeg" };
    }
    return await urlToBase64(source);
  }

  const ai = new GoogleGenAI({ apiKey });
  const baseParts = await buildGeminiParts(imageSources, userPrompt, normalize);
  let finalText = "";
  let attempt = 0;

  while (attempt <= maxReconnectAttempts) {
    onStatus?.(attempt === 0 ? "streaming" : "reconnecting", attempt);
    try {
      const resumedParts =
        finalText.length > 0
          ? [
              ...baseParts,
              {
                text: `你刚刚生成到这里：\n${finalText}\n\n请从下一句继续输出，不要重复已生成内容。`,
              },
            ]
          : baseParts;
      const stream = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: [{ role: "user", parts: resumedParts }],
      });

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (!chunkText) continue;

        const delta = attempt === 0 ? chunkText : mergeContinuationText(finalText, chunkText);
        if (!delta) continue;
        finalText += delta;
        onChunk(delta);
      }

      onStatus?.("done", attempt);
      const trimmed = finalText.trim();
      if (!trimmed) throw new Error("未能从 AI 获取 caption");
      return trimmed;
    } catch (err) {
      if (attempt >= maxReconnectAttempts || !isRetryableError(err)) {
        throw err;
      }
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    }
  }

  throw new Error("流式生成失败，请稍后重试");
}
