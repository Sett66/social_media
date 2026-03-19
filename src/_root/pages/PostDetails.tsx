import { useEffect, useState } from "react";
import GridPostList from "@/components/shared/GridPostList";
import PostStars from "@/components/shared/PostStats";
import { Button } from "@/components/ui/button";
import { useUserContext } from "@/context/AuthContext";
import {
  useDeletePost,
  useGetPostById,
  useGetUserPosts,
} from "@/lib/react-query/queriesAndMutations";
import { formatDate } from "@/lib/utils";
import { Loader } from "lucide-react";
import { useParams, Link, useNavigate } from "react-router-dom";

const PostDetails = () => {
  const { id } = useParams();
  const { data: post, isPending } = useGetPostById(id || "");
  const { user } = useUserContext();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 换一篇帖子时从第一张开始，避免上一帖的索引大于新帖张数
  useEffect(() => {
    setCurrentImageIndex(0);
    setSelectedImage(null);
  }, [id]);

  const navigate = useNavigate();
  const { data: userPosts, isPending: isUserPostLoading } = useGetUserPosts(
    post?.creator.$id,
  );
  const { mutate: deletePost } = useDeletePost();

  const relatedPosts = userPosts?.documents.filter(
    (userPost) => userPost.$id !== id,
  );

  const handleDeletePost = () => {
    deletePost({ postId: id, imageIds: post?.imageIds ?? post?.imageId ?? [] });
    navigate(-1);
  };

  return (
    <div className="post_details-container">
      <div className="hidden md:flex max-w-5xl w-full">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="shad-button_ghost"
        >
          <img
            src={"/assets/icons/back.svg"}
            alt="back"
            width={24}
            height={24}
          />
          <p className="small-medium lg:base-medium">Back</p>
        </Button>
      </div>

      {isPending || !post ? (
        <Loader />
      ) : (
        <div className="post_details-card">
          {(() => {
            const hasImages =
              Array.isArray(post.imageUrls) && post.imageUrls.length > 0;

            return (
              <div
                className={
                  hasImages
                    ? "flex flex-col lg:flex-row gap-7 w-full"
                    : "w-full"
                }
              >
                {/* 左侧：图片区域（仅在有图时占据宽度） */}
                {hasImages && (
                  <div className="w-full lg:w-1/2 mb-6 lg:mb-0">
                    <div className="relative rounded-xl overflow-hidden bg-dark-1">
                      {/* 当前显示的图片 */}
                      <img
                        src={String(
                          (post.imageUrls as (string | URL)[])[
                            currentImageIndex
                          ],
                        )}
                        alt="post image"
                        className="w-full h-80 md:h-96 object-cover cursor-pointer"
                        onClick={() =>
                          setSelectedImage(
                            String(
                              (post.imageUrls as (string | URL)[])[
                                currentImageIndex
                              ],
                            ),
                          )
                        }
                      />

                      {/* 左箭头 */}
                      {(post.imageUrls as (string | URL)[]).length > 1 && (
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (prevIndex) =>
                                (prevIndex -
                                  1 +
                                  (post.imageUrls as (string | URL)[]).length) %
                                (post.imageUrls as (string | URL)[]).length,
                            )
                          }
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition"
                          aria-label="Previous image"
                        >
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                      )}

                      {/* 右箭头 */}
                      {(post.imageUrls as (string | URL)[]).length > 1 && (
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (prevIndex) =>
                                (prevIndex + 1) %
                                (post.imageUrls as (string | URL)[]).length,
                            )
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition"
                          aria-label="Next image"
                        >
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      )}

                      {/* 图片计数器 */}
                      {(post.imageUrls as (string | URL)[]).length > 1 && (
                        <div className="absolute top-3 right-3 bg-black/40 text-white px-3 py-1 rounded-full text-sm">
                          {currentImageIndex + 1} /{" "}
                          {(post.imageUrls as (string | URL)[]).length}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 右侧：信息区域（有图时占 2/5，无图时全宽） */}
                <div
                  className={
                    hasImages
                      ? "w-full lg:w-2/5 post_details-info"
                      : "w-full post_details-info"
                  }
                >
                  <div className="flex-between w-full">
                    <Link
                      to={`/profile/${post?.creator.$id}`}
                      className="flex items-center gap-3"
                    >
                      <img
                        src={
                          post?.creator?.imageUrl ||
                          "assets/icons/profile-placeholder.svg"
                        }
                        alt="creator"
                        className="w-8 h-8 rounded-full lg:w-12 lg:h-12"
                      />

                      <div className="flex flex-col">
                        <p className="base-medium lg:body-bold text-light-1">
                          {post?.creator.name}
                        </p>
                        <div className="flex-center gap-2 text-light-3">
                          <p>{formatDate(post?.$createdAt)}</p>-
                          <p className="subtle-semibold lg:small-regular">
                            {post?.location}
                          </p>
                        </div>
                      </div>
                    </Link>

                    <div className="flex-center gap-4">
                      <Link
                        to={`/update-post/${post.$id}`}
                        className={`${
                          user.id !== post?.creator.$id && "hiden"
                        }`}
                      >
                        <img
                          src="/assets/icons/edit.svg"
                          width={24}
                          height={24}
                          alt="edit"
                        />
                      </Link>

                      <Button
                        onClick={handleDeletePost}
                        variant="ghost"
                        className={`ghost_details-delete_btn $${
                          user.id !== post?.creator.$id && "hiden"
                        }`}
                      >
                        <img
                          src="/assets/icons/delete.svg"
                          alt="delete"
                          width={24}
                          height={24}
                        />
                      </Button>
                    </div>
                  </div>

                  <hr className="border w-full border-dark-4/80" />

                  <div className="flex flex-col flex-1 w-full small-medium lg:base-regular">
                    <p>{post?.caption}</p>
                    <ul className="flex gap-1 mt-2">
                      {post?.tags.map((tag: string) => (
                        <li key={tag} className="text-light-3">
                          #{tag}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="w-full">
                    <PostStars post={post} userId={user.id} />
                  </div>
                </div>
              </div>
            );
          })()}
          {/* lightbox modal for selected image */}
          {selectedImage && (
            <div
              className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
              onClick={() => setSelectedImage(null)}
            >
              <img
                src={selectedImage}
                alt="full view"
                className="max-w-full max-h-full"
              />
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-5xl">
        <hr className="border w-full border-dark-4/80" />
        <h3 className="body-bold md:h3-bold w-full my-10">
          More Related Posts
        </h3>
        {isUserPostLoading || !relatedPosts ? (
          <Loader />
        ) : (
          <GridPostList posts={relatedPosts} />
        )}
      </div>
    </div>
  );
};

export default PostDetails;
