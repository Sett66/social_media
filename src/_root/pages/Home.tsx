import { useGetRecentPosts } from "@/lib/react-query/queriesAndMutations";
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
            <ul> test </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home