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
import { generateCaptionWithGemini } from "@/lib/gemini/generateCaption";
import { useEffect, useMemo, useState } from "react";

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
      tags: post ? post.tags.join("#") : "",
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
    const files = form.getValues("file") ?? [];
    const firstFile =
      Array.isArray(files) && files.length > 0 ? files[0] : null;
    const firstUrl = keptImageUrls.length > 0 ? keptImageUrls[0] : null;

    const imageSource = firstFile ?? firstUrl;
    // if (!imageSource) {
    //   toast({ title: "请先添加图片", variant: "destructive" });
    //   return;
    // }

    setIsGeneratingCaption(true);
    try {
      const caption = await generateCaptionWithGemini(
        imageSource as File | string,
        aiPromptHint || undefined,
      );
      form.setValue("caption", caption);
      toast({ title: "AI caption 生成成功" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "生成失败，请稍后重试";
      toast({ title: msg, variant: "destructive" });
      console.error(err);
    } finally {
      setIsGeneratingCaption(false);
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
                  fieldChange={field.onChange}
                  mediaUrls={keptImageUrls}
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
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_lable">
                Add Tags(separated by ",")
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  className="shad-input"
                  placeholder="AI, Arts, React"
                  {...field}
                />
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
