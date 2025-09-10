import React, { useEffect, useState } from 'react'
import type { Post } from '@/types';
import type { Models } from 'appwrite';
import { useDeleteSavedPost, useGetCurrentUser, useLikePost, useSavePost } from '@/lib/react-query/queriesAndMutations';
import { useUserContext } from '@/context/AuthContext';
import { checkIsLiked } from '@/lib/utils';

type PostStarsProps = {
  post?: Post; 
  userId:string;
};

const PostStars = ({post, userId}:PostStarsProps) => {
  const likesList = post?.likes.map((user:Models.Document)=>user.$id)

  const [likes,setLikes] = useState(likesList);
  const [isSaved,setIsSaved] = useState(false);

  const { mutate:likePost } = useLikePost();
  const { mutate:savePost } = useSavePost();
  const { mutate:deleteSavedPost } = useDeleteSavedPost();

  const { data: currentUser } = useGetCurrentUser();

  const savedPostRecord = currentUser?.save.find((record:Models.Document)=> record.post.$id === post?.$id);

  useEffect(()=>{
    setIsSaved(!!savedPostRecord)
    //(savedPostRecord?true:false)
  },[currentUser])

  const handleLikePost = (e:React.MouseEvent)=>{
    e.stopPropagation();
    let newLikes=[...likes];
    const hasLiked = newLikes.includes(userId)
    if(hasLiked){
      newLikes = newLikes.filter((id) => id !== userId);
    }else{
      newLikes.push(userId);
    }
    setLikes(newLikes);
    likePost({ postId: post?.$id||'', likesArray:newLikes});
  }

  const handleSavePost = (e:React.MouseEvent)=>{
    e.stopPropagation();

    if(savedPostRecord){
      setIsSaved(false);
      deleteSavedPost(savedPostRecord.$id);
    }else{
      savePost({postId:post?.$id||'',userId})
      setIsSaved(true);
    }
  }
 
  return (
    <div className='flex justify-between items-center z-20'>
        <div className='flex gap-2 mr-5'>
            <img className='cursor-pointer'
                src={checkIsLiked(likes,userId)
                  ?'/assets/icons/liked.svg'
                  :'/assets/icons/like.svg'
                }
                alt='like'
                width={20}
                height={20}
                onClick={handleLikePost}
            />
            <p className='small-medium lg:base-medium'>{likes.length}</p>
        </div>
        <div className='flex justify-between items-center z-20'>
        <div className='flex gap-2'>
            <img className='cursor-pointer'
                src={isSaved
                  ?'/assets/icons/saved.svg'
                  :'/assets/icons/save.svg'
                }
                alt='like'
                width={20}
                height={20}
                onClick={handleSavePost}
            />
        </div>
    </div>
    </div>
    
  )
}

export default PostStars