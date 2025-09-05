import PostCard from "@/components/shared/PostCard";
import { useGetRecentPosts } from "@/lib/react-query/queriesAndMutations";
import type { Models } from "appwrite";
import { Loader } from "lucide-react";
import { use } from "react";

const Home = () => {
  const { data: post, isPending:isPostLoading, isError:isErrorPost} = useGetRecentPosts();

  return (
    <div className="flex flex-1">
      <div className='home-contariner'>
        <div className='home-posts'>
          <h2 className='h3-bold md:h2-bold text-left w-full'>Home Feed</h2>
          {isPostLoading &&!post?(
            <Loader/>
          ):(
            <ul className="flex flex-col flex-1 gap-9 w-full">
              {post?.documents.map((post:Models.Document)=>(
                <li key={post.$id} className="flex justify-center w-full">
                  <PostCard post={post} />
                </li>
              ))}
              
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home