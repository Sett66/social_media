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

  const navigate = useNavigate();
  const { data: userPosts, isPending: isUserPostLoading } = useGetUserPosts(
    post?.creator.$id
  );
  const { mutate: deletePost } = useDeletePost();

  const relatedPosts = userPosts?.documents.filter(
    (userPost) => userPost.$id !== id
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
                {/* 左侧：多图区域（仅在有图时占据宽度） */}
                {hasImages && (
                  <div className="w-full lg:w-1/2 mb-6 lg:mb-0">
                    {/* 每行固定 2 张图片，避免右侧信息过窄 */}
                    <div className="grid grid-cols-2 gap-3">
                      {(post.imageUrls as (string | URL)[]).map(
                        (url, index) => (
                          <img
                            key={`${String(url)}-${index}`}
                            src={String(url)}
                            alt={`post image ${index + 1}`}
                            className="w-full h-60 md:h-72 object-cover rounded-xl"
                          />
                        )
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
