import { useGetCurrentUser } from "@/lib/react-query/queriesAndMutations";
import type { Models } from "appwrite";
import Loader from "@/components/shared/Loader";
import React from "react";
import GridPostList from "@/components/shared/GridPostList";

const Saved = () => {
  const { data: currentUser } = useGetCurrentUser();

  const savePosts = currentUser?.save
    .map((savePost: Models.Document) => ({
      ...savePost.post,
      creator: {
        imageUrl: currentUser.imageUrl,
      },
    }))
    .reverse();
  return (
    <div>
      <div className="flex gap-2 w-full max-w-5xl">
        <img
          src="/assets/icons/saved.svg"
          alt="edit"
          height={36}
          width={36}
          className="invert-white"
        />
        {!currentUser ? (
          <Loader />
        ) : (
          <ul className="w-full felx justify-center max-w-5xl gap-9">
            {savePosts.length === 0 ? (
              <p className="text-light-4">No saved posts</p>
            ) : (
              <GridPostList posts={savePosts} showStats={false} />
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Saved;
