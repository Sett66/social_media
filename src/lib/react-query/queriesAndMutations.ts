import {
    useQuery,// fetch the data
    useMutation,// modify the data
    useQueryClient,
    useInfiniteQuery
} from '@tanstack/react-query';
import { createPost, createUserAccount, deletePost, deleteSavedPost, getCurrentUser, getInfinitePosts, getPostById, 
        getRecentPosts, GetUsers, likePost, savePost, searchPosts, signInAccount, signOutAccount, updatePost,GetUserById,updateUser, 
        getUserPosts, createOAuth2Session, handleOAuthCallback,} from '../appwrite/api';
import type { INewPost, INewUser, IUpdatePost, IUpdateUser } from '@/types';
import { QUERY_KEYS } from './queryKeys';
import type { OAuthProvider } from 'appwrite';

export const useCreateUserAccount =() =>{
    return useMutation({
        mutationFn: (user: INewUser) => createUserAccount(user)
})
}

export const useSignInAccount =() =>{
    return useMutation({
        mutationFn: (user: {email:string; password:string }) => signInAccount(user)
})
}

export const useSignOutAccount =() =>{
    return useMutation({
        mutationFn: () => signOutAccount()
})
}

export const useCreatePost =()=>{
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn:(post:INewPost)=> createPost(post),
        onSuccess:()=>{
            queryClient.invalidateQueries({ 
                queryKey: [QUERY_KEYS.GET_RECENT_POSTS]
            });
        }
    })
}

export const useGetRecentPosts=()=>{
    return useQuery({
        queryKey:[QUERY_KEYS.GET_RECENT_POSTS],
        queryFn:getRecentPosts
    })
}

// export const useLikePost=()=>{
//     const queryClient = useQueryClient();
//     return useMutation({
//         mutationFn:({postId,likesArray}:{postId:string;likesArray:string[]})=>likePost(postId,likesArray),
//         onSuccess:(data)=>{
//             queryClient.invalidateQueries({
//                 queryKey:[QUERY_KEYS.GET_POST_BY_ID,data?.$id]
//             })
//             queryClient.invalidateQueries({
//                 queryKey:[QUERY_KEYS.GET_RECENT_POSTS]
//             })
//             queryClient.invalidateQueries({
//                 queryKey:[QUERY_KEYS.GET_POSTS]
//             })
//             queryClient.invalidateQueries({
//                 queryKey:[QUERY_KEYS.GET_CURRENT_USER]
//             })
//         }
//     })
// }

export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, likesArray }: { postId: string; likesArray: string[] }) =>
      likePost(postId, likesArray),
    
    // 1. 发起请求前立刻执行 (乐观更新的核心)
    onMutate: async ({ postId, likesArray }) => {
      // a. 撤销相关的正在进行的后台重新获取请求，防止冲突
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.GET_POSTS] });

      // b. 截屏保存当前缓存中的旧数据 (为了失败时回滚)
      const previousPosts = queryClient.getQueryData([QUERY_KEYS.GET_POSTS]);

      // c. 乐观地更新缓存！(不用等后端，直接把缓存里的 likes 数组替换掉)
      // 注意：这里需要根据你缓存的具体结构 (InfiniteData 或 Array) 来精确修改，
      // 简单起见，我们通知整体缓存刷新，但更好的做法是直接操作 queryClient.setQueryData
      
      return { previousPosts }; // 把旧数据传递给 onError
    },

    // 2. 如果请求失败了 (回滚)
    onError: (err, newLike, context) => {
      // 恢复到 onMutate 中保存的旧数据
      if (context?.previousPosts) {
        queryClient.setQueryData([QUERY_KEYS.GET_POSTS], context.previousPosts);
      }
    },

    // 3. 无论成功或失败，最后都执行 (确保最终一致性)
    onSettled: () => {
      // 去服务器拉一下最新数据，消除任何潜在的误差
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_POSTS] });
    },
  });
};

export const useSavePost=()=>{
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:({postId,userId}:{postId:string;userId:string})=>savePost(postId,userId),
        onSuccess:()=>{
            queryClient.invalidateQueries({
                queryKey:[QUERY_KEYS.GET_RECENT_POSTS]
            })
            queryClient.invalidateQueries({
                queryKey:[QUERY_KEYS.GET_POSTS]
            })
            queryClient.invalidateQueries({
                queryKey:[QUERY_KEYS.GET_CURRENT_USER]
            })
        }
    })
}

export const useDeleteSavedPost=()=>{
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:(savedRecordId:string)=>deleteSavedPost(savedRecordId),
        onSuccess:()=>{
            queryClient.invalidateQueries({
                queryKey:[QUERY_KEYS.GET_RECENT_POSTS]
            })
            queryClient.invalidateQueries({
                queryKey:[QUERY_KEYS.GET_POSTS]
            })
            queryClient.invalidateQueries({
                queryKey:[QUERY_KEYS.GET_CURRENT_USER]
            })
        }
    })
}

export const useGetCurrentUser=()=>{
    return useQuery({
        queryKey:[QUERY_KEYS.GET_CURRENT_USER],
        queryFn:getCurrentUser
    })
}

export const useGetPostById=(postId:string)=>{
    return useQuery({
        queryKey:[QUERY_KEYS.GET_POST_BY_ID,postId],
        queryFn:()=>getPostById(postId),
        enabled:!!postId
    })
}

export const useUpdatePost=()=>{
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn:(post:IUpdatePost)=> updatePost(post),
        onSuccess:(data)=>{
            queryClient.invalidateQueries({
                queryKey:[QUERY_KEYS.GET_POST_BY_ID,data?.$id]
            })
        }
    })
}


export const useDeletePost=()=>{
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn:({ postId, imageIds}:{postId:string, imageIds:string | string[] })=> deletePost(postId, imageIds),
        onSuccess:()=>{
            queryClient.invalidateQueries({
                queryKey:[QUERY_KEYS.GET_RECENT_POSTS]
            })
        }
    })
}

export const useGetPosts=()=>{
    return useInfiniteQuery({
        queryKey:[QUERY_KEYS.GET_INFINITE_POSTS],
        queryFn:getInfinitePosts,
        getNextPageParam:(lastPage)=>{
            if(lastPage &&lastPage.documents.length===0) return null;
            const lastId = lastPage?.documents[lastPage?.documents.length-1].$id;
            return lastId;
        }
    })
}

export const useSearchPosts=(searchTerm:string)=>{
    return useQuery({
        queryKey:[QUERY_KEYS.SEARCH_POSTS, searchTerm],
        queryFn:()=>searchPosts(searchTerm),
        enabled:!!searchTerm
    })
}

export const useGetUsers=(limit?:number)=>{
    return useQuery({
        queryKey:[QUERY_KEYS.GET_USERS],
        queryFn:()=>GetUsers(limit),
    })
}

export const useGetUserById=(userId:string)=>{
    return useQuery({
        queryKey:[QUERY_KEYS.GET_USER_BY_ID,userId],
        queryFn:()=>GetUserById(userId),
        enabled:!!userId,
    })
}

export const useUpdateUser=()=>{
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:(user:IUpdateUser)=>updateUser(user),
        onSuccess:(data)=>{
            queryClient.invalidateQueries({
                queryKey:[QUERY_KEYS.GET_CURRENT_USER],
            })
            queryClient.invalidateQueries({
                queryKey:[QUERY_KEYS.GET_USER_BY_ID,data?.$id],
            })
        }
    })
}

export const useGetUserPosts = (userId?: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.GET_USER_POSTS, userId],
        queryFn: () => getUserPosts(userId),
        enabled: !!userId,
    });
};

// GitHub / 其他 Provider 登录（开启 OAuth 流程）
export const useOAuthLogin = () => {
    return useMutation({
      mutationFn: (provider: OAuthProvider) => createOAuth2Session(provider),
    });
  };

// 回调页中使用，处理用户文档 + 同步状态
export const useHandleOAuthCallback = () => {
    return useMutation({
      mutationFn: () => handleOAuthCallback(),
    });
};