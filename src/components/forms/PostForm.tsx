import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import FileUploader from "../shared/FileUploader";
import { PostValidation } from "@/lib/validation";
import { useToast } from "@/hooks/use-toast";
import { useUserContext } from "@/context/AuthContext";
import {
  useCreatePost,
  useUpdatePost,
} from "@/lib/react-query/queriesAndMutations";
import type { Post } from "@/types";
import { generateCaptionWithGeminiStream } from "@/lib/gemini/generateCaption";
import { useEffect, useMemo, useState } from "react";

function sanitizeChunk(chunk: string): string {
  return chunk
    .replace(/\uFFFD/g, "")                  // replacement char
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") // control chars
    .replace(/[^\S\r\n]{3,}/g, " ");         // excessive spaces
}

/**
 * Extract hashtags from the end of caption text
 * Returns cleaned caption and hashtags formatted with # separator
 */
function extractHashtagsFromCaption(text: string): {
  caption: string;
  hashtags: string;
} {
  // Extract all hashtags (including Chinese characters) from the text
  const hashtagPattern = /(#[\u4e00-\u9fff\w]+)/g;
  const matches = text.match(hashtagPattern);

  if (!matches || matches.length === 0) {
    // console.log("[extractHashtagsFromCaption] No hashtags found in:", text);
    return { caption: text, hashtags: "" };
  }

  // Remove all hashtags from the caption and clean up
  let cleanCaption = text;
  matches.forEach((tag) => {
    cleanCaption = cleanCaption.replace(tag, "").trim();
  });
  cleanCaption = cleanCaption.replace(/\s+/g, " ").trim();

  // Keep # prefix and join with comma and space
  const tags = matches.join(", ");

  // console.log("[extractHashtagsFromCaption] Found hashtags:", tags);
  // console.log("[extractHashtagsFromCaption] Clean caption:", cleanCaption);

  return { caption: cleanCaption, hashtags: tags };
}

type PostFormProps = {
  post?: Post;
  action: "Create" | "Update";
};

const PostForm = ({ post, action }: PostFormProps) => {
  const { mutateAsync: createPost, isPending: isLoadingCreate } =
    useCreatePost();
  const { mutateAsync: updatePost, isPending: isLoadingUpdate } =
    useUpdatePost();

  const { user } = useUserContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  // For update: keep/remove existing images (stored in Appwrite)
  const initialExisting = useMemo(() => {
    const urls = (post?.imageUrls?.map(String) ??
      (post?.imageUrl ? [post.imageUrl] : [])) as string[];
    const ids = post?.imageIds ?? (post?.imageId ? [post.imageId] : []);
    return { urls, ids };
  }, [post]);

  const [keptImageUrls, setKeptImageUrls] = useState<string[]>(
    initialExisting.urls,
  );
  const [keptImageIds, setKeptImageIds] = useState<string[]>(
    initialExisting.ids,
  );
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [aiPromptHint, setAiPromptHint] = useState("");
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [streamStatusText, setStreamStatusText] = useState("");

  // when switching between posts (or initial fetch), refresh kept lists
  useEffect(() => {
    setKeptImageUrls(initialExisting.urls);
    setKeptImageIds(initialExisting.ids);
    setRemovedImageIds([]);
  }, [initialExisting.urls, initialExisting.ids]);

  const form = useForm<z.infer<typeof PostValidation>>({
    resolver: zodResolver(PostValidation),
    defaultValues: {
      caption: post ? post?.caption : "",
      file: [],
      location: post ? post?.location : "",
      tags: post ? `#${post.tags.join(", #")}` : "",
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof PostValidation>) {
    if (post && action === "Update") {
      const updatedPost = await updatePost({
        ...values,
        postId: post.$id,
        keptImageIds,
        keptImageUrls,
        removedImageIds,
      });
      if (!updatedPost) {
        toast({ title: "update fail" });
      }
      return navigate(`/posts/${post.$id}`);
    }
    const newPost = await createPost({
      ...values,
      userId: user.id,
    });
    if (!newPost) {
      toast({ title: "error" });
    }
    navigate("/");
  }

  const handleGenerateCaption = async () => {
    // collect any newly uploaded files and kept urls
    const files = (form.getValues("file") as File[]) ?? [];
    const imageSources: Array<File | string> = [];
    if (files.length) imageSources.push(...files);
    if (keptImageUrls.length) imageSources.push(...keptImageUrls);

    // if we have at least one image, pass the array; otherwise undefined

    setIsGeneratingCaption(true);
    try {
      form.setValue("caption", "");
      setStreamStatusText("正在流式生成...");

      const generatedCaption = await generateCaptionWithGeminiStream({
        imageSources: imageSources.length > 0 ? imageSources : undefined,
        userPrompt: aiPromptHint || undefined,
        onChunk: (chunk) => {
          const sanitizedChunk = sanitizeChunk(chunk);
          const currentCaption = form.getValues("caption");
          form.setValue("caption", `${currentCaption}${sanitizedChunk}`);
        },
        onStatus: (status, attempt) => {
          if (status === "reconnecting") {
            setStreamStatusText(`网络波动，正在重连（第 ${attempt} 次）...`);
            return;
          }
          if (status === "done") {
            setStreamStatusText("生成完成");
            return;
          }
          setStreamStatusText("正在流式生成...");
        },
      });
      // Extract hashtags from the end of caption
      const { caption, hashtags } =
        extractHashtagsFromCaption(generatedCaption);
      // console.log(
      //   "[handleGenerateCaption] Generated caption:",
      //   generatedCaption,
      // );
      // console.log(
      //   "[handleGenerateCaption] After extraction - caption:",
      //   caption,
      //   "hashtags:",
      //   hashtags,
      // );
      form.setValue("caption", caption);
      // If hashtags were found, merge with existing tags
      if (hashtags) {
        const currentTags = form.getValues("tags");
        const mergedTags = currentTags
          ? `${currentTags}, ${hashtags}`
          : hashtags;
        // console.log("[handleGenerateCaption] Setting tags to:", mergedTags);
        form.setValue("tags", mergedTags);
      } else {
        console.log("[handleGenerateCaption] No hashtags extracted");
      }
      toast({ title: "AI caption 生成成功" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "生成失败，请稍后重试";
      toast({ title: msg, variant: "destructive" });
      console.error(err);
    } finally {
      setIsGeneratingCaption(false);
      setTimeout(() => setStreamStatusText(""), 1500);
    }
  };

  // const hasAnyImage =
  //   (form.watch("file")?.length ?? 0) > 0 || keptImageUrls.length > 0;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-9 w-full max-x-5xl"
      >
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_lable">Add Photos</FormLabel>
              <FormControl>
                <FileUploader
                  fieldChange={field.onChange} // 通过field.onChange把选中的文件传回react-hook-form
                  mediaUrls={keptImageUrls} // 在编辑模式下已存在的旧图URL
                  // 删除旧图时的回调，先把不要的旧图记录下来，最终提交的时候统一处理
                  onRemoveExisting={(index) => {
                    setRemovedImageIds((prev) => {
                      const id = keptImageIds[index];
                      return id ? [...prev, id] : prev;
                    });
                    setKeptImageIds((prev) => {
                      const next = [...prev];
                      next.splice(index, 1);
                      return next;
                    });
                    setKeptImageUrls((prev) => {
                      const next = [...prev];
                      next.splice(index, 1);
                      return next;
                    });
                  }}
                />
              </FormControl>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />
        {/* {hasAnyImage && ( */}
        <div className="space-y-2">
          <FormLabel className="shad-form_lable">
            AI 生成 Caption（可选）
          </FormLabel>
          <div className="flex gap-2 flex-wrap">
            <Input
              type="text"
              className="shad-input flex-1 min-w-[160px]"
              placeholder="输入提示词，如：强调美食、氛围感、旅行心情"
              value={aiPromptHint}
              onChange={(e) => setAiPromptHint(e.target.value)}
              disabled={isGeneratingCaption}
            />
            <Button
              type="button"
              variant="outline"
              className="shad-button_dark_4 whitespace-nowrap"
              onClick={handleGenerateCaption}
              disabled={isGeneratingCaption}
            >
              {isGeneratingCaption ? "生成中..." : "AI 生成 Caption"}
            </Button>
          </div>
          {streamStatusText && (
            <p className="text-xs text-light-4">{streamStatusText}</p>
          )}
        </div>
        {/* )} */}
        <FormField
          control={form.control}
          name="caption"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_lable">Caption</FormLabel>
              <FormControl>
                <Textarea
                  className="shad-textarea custom-scrollbar"
                  {...field}
                />
              </FormControl>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_lable">
                Add Tags(separated by ", ")
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  className="shad-input"
                  placeholder="#AI, #Arts, #React"
                  {...field}
                />
              </FormControl>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_lable">Add Location</FormLabel>
              <FormControl>
                <Input type="text" className="shad-input" {...field} />
              </FormControl>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />
        <div className="flex gap-4 items-center justify-end">
          <Button type="button" className="shad-button_dark_4">
            Cancel
          </Button>
          <Button
            type="submit"
            className="shad-button_primary whitespace-nowrap"
          >
            {isLoadingCreate || (isLoadingUpdate && "Loading...")} {action} Post
          </Button>
        </div>
      </form>
    </Form>
  );
};
export default PostForm;
