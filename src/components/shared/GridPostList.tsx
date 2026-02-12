import { useUserContext } from "@/context/AuthContext";
import type { Models } from "appwrite";
import React from "react";
import { Link } from "react-router-dom";
import PostStats from "./PostStats";

type GridPostListProps = {
  posts: Models.Document[];
  showUser?: boolean;
  showStats?: boolean;
};

const GridPostList = ({
  posts,
  showUser = true,
  showStats = true,
}: GridPostListProps) => {
  const { user } = useUserContext();

  return (
    <ul className="grid-container">
      {posts.map((post) => (
        <li key={post.$id} className="relative min-w-80 h-80">
          <Link to={`/posts/${post.$id}`} className="grid-post_link">
            {((post.imageUrls?.[0] as any) ?? post.imageUrl) ? (
              <img
                src={(post.imageUrls?.[0] as any) ?? post.imageUrl}
                alt="post"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex flex-col items-start justify-start bg-gradient-to-br from-dark-3 to-dark-4 px-4 pt-4">
                <p className="text-light-1 font-medium line-clamp-2">
                  {post.caption || "No image"}
                </p>
                {post.tags && post.tags.length > 0 && (
                  <p className="text-light-3 text-xs mt-1 line-clamp-1">
                    #{post.tags[0]}
                    {post.tags.length > 1 && " ..."}
                  </p>
                )}
              </div>
            )}
          </Link>

          <div className="grid-post_user">
            {showUser && (
              <div className="flex items-center justify-start gap-2 flex-1">
                <img
                  src={
                    post.creator.imageUrl ||
                    "/assets/icons/profile-placeholder.svg"
                  }
                  alt="creator"
                  className="w-8 h-8 rounded-full"
                />
                <p className="line-clamp-1">{post.creator.name}</p>
              </div>
            )}
            {showStats && <PostStats post={post} userId={user.id} />}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default GridPostList;
