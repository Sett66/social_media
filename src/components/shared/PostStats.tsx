import React, { useEffect, useState } from "react";
import type { Models } from "appwrite";
import {
  useDeleteSavedPost,
  useGetCurrentUser,
  useLikePost,
  useSavePost,
} from "@/lib/react-query/queriesAndMutations";
import { checkIsLiked } from "@/lib/utils";

type PostStatsProps = {
  post?: Models.Document;
  userId: string;
};

const PostStats = ({ post, userId }: PostStatsProps) => {
  // 🌟 核心修复 1：兼容 Appwrite 返回的 likes 是字符串数组还是对象数组
  const getLikes = (likesArray: any[]) => {
    return likesArray.map((user: any) =>
      typeof user === "string" ? user : user.$id,
    );
  };

  const [likes, setLikes] = useState<string[]>(getLikes(post?.likes ?? []));
  const [isSaved, setIsSaved] = useState(false);

  const { mutate: likePost } = useLikePost();
  const { mutate: savePost } = useSavePost();
  const { mutate: deleteSavedPost } = useDeleteSavedPost();

  const { data: currentUser } = useGetCurrentUser();

  // 🌟 核心修复 2：兼容 record.post 是字符串还是对象
  const checkIsSaved = () => {
    if (!currentUser?.save || !post?.$id) return false;
    return !!currentUser.save.find((record: any) => {
      const recordPostId =
        typeof record.post === "string" ? record.post : record.post?.$id;
      return recordPostId === post.$id;
    });
  };

  // 监听数据变化，确保异步加载时状态能同步
  useEffect(() => {
    setLikes(getLikes(post?.likes ?? []));
  }, [post?.likes]);

  useEffect(() => {
    setIsSaved(checkIsSaved());
  }, [currentUser, post?.$id]);

  const handleLikePost = (e: React.MouseEvent) => {
    e.stopPropagation();
    let newLikes = [...likes];
    const hasLiked = newLikes.includes(userId);
    if (hasLiked) {
      newLikes = newLikes.filter((id) => id !== userId);
    } else {
      newLikes.push(userId);
    }
    setLikes(newLikes);
    likePost({ postId: post?.$id || "", likesArray: newLikes });
  };

  const handleSavePost = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 再次安全提取寻找要删除的 record
    const savedRecord = currentUser?.save.find((record: any) => {
      const recordPostId =
        typeof record.post === "string" ? record.post : record.post?.$id;
      return recordPostId === post?.$id;
    });

    if (savedRecord) {
      setIsSaved(false);
      deleteSavedPost(savedRecord.$id);
    } else {
      savePost({ postId: post?.$id || "", userId });
      setIsSaved(true);
    }
  };

  return (
    <div className="flex justify-between items-center z-20">
      <div className="flex gap-2 mr-5">
        <img
          className="cursor-pointer"
          src={
            checkIsLiked(likes, userId)
              ? "/assets/icons/liked.svg"
              : "/assets/icons/like.svg"
          }
          alt="like"
          width={20}
          height={20}
          onClick={handleLikePost}
        />
        <p className="small-medium lg:base-medium">{likes.length}</p>
      </div>
      <div className="flex justify-between items-center z-20">
        <div className="flex gap-2">
          <img
            className="cursor-pointer"
            src={isSaved ? "/assets/icons/saved.svg" : "/assets/icons/save.svg"}
            alt="save"
            width={20}
            height={20}
            onClick={handleSavePost}
          />
        </div>
      </div>
    </div>
  );
};

export default PostStats;
