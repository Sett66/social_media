import { useUserContext } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";
import type { Post } from "@/types";
import { Link } from "react-router-dom";
import PostStars from "./PostStats";

type PostCardProps = {
  post: Post;
};

const PostCard = ({ post }: PostCardProps) => {
  const { user } = useUserContext();
  if (!post.creator) return null;

  const imageUrls = (post.imageUrls ?? []) as (string | URL)[];
  const imageSrcs = imageUrls.map(String);
  const imageCount = imageSrcs.length;
  const hasImages = imageCount > 0;
  const displayImages = imageSrcs.slice(0, 4);
  const extraCount = imageCount > 4 ? imageCount - 3 : 0;

  return (
    <div className="post-card">
      <div className="flex-between">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.creator.$id}`}>
            <img
              src={
                post.creator?.imageUrl ||
                "assets/icons/profile-placeholder.svg"
              }
              alt="creator"
              className="w-12 h-12 rounded-full object-cover"
            />
          </Link>
          <div className="flex flex-col">
            <p className="base-medium lg:body-bold text-light-1">
              {post.creator.name}
            </p>
            <div className="flex-center gap-2 text-light-3">
              <p>{formatDate(post.$createdAt)}</p>-{/* 时间和地点 */}
              <p className="subtle-semibold lg:small-regular">
                {post.location}
              </p>
            </div>
          </div>
        </div>
        <Link to={`/update-post/${post.$id}`}>
          <img src="/assets/icons/edit.svg" alt="edit" width={20} height={20} />
        </Link>
      </div>

      <Link to={`/posts/${post.$id}`}>
        <div className="small-medium lg:base-medium py-5">
          <p>{post.caption}</p>
          <ul className="flex gap-1 mt-2">
            {post.tags.map((tag: string) => (
              <li key={tag} className="text-light-3">
                #{tag}
              </li>
            ))}
          </ul>
        </div>

        {hasImages && (
          <>
            {/* 1 张图：直接大图展示 */}
            {imageCount === 1 && (
              <img
                src={imageSrcs[0]}
                alt="post image"
                className="post-card_img"
              />
            )}

            {/* 2 张图：左右两列 */}
            {imageCount === 2 && (
              <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden h-60 bg-dark-4">
                {imageSrcs.map((src, index) => (
                  <img
                    key={`${src}-${index}`}
                    src={src}
                    alt={`post image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ))}
              </div>
            )}

            {/* 3 张及以上：2×2 网格 + 省略遮罩 */}
            {imageCount >= 3 && (
              <div className="grid grid-cols-2 grid-rows-2 gap-1 rounded-xl overflow-hidden h-60 bg-dark-4">
                {displayImages.map((src, index) => {
                  const showOverlay =
                    extraCount > 0 && index === displayImages.length - 1;
                  return (
                    <div
                      key={`${src}-${index}`}
                      className="relative w-full h-full"
                    >
                      <img
                        src={src}
                        alt={`post image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {showOverlay && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-light-1 text-lg font-semibold">
                            +{extraCount}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Link>

      <PostStars post={post} userId={user.id} />
    </div>
  );
};

export default PostCard;