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
    mutationFn: ({ postId, likesArray, version }: { postId: string; likesArray: string[]; version: number }) =>
      likePost(postId, likesArray),

    onMutate: async ({ postId, likesArray, version }) => {
      // 1) 取消相关查询
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.GET_INFINITE_POSTS] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.GET_RECENT_POSTS] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.GET_POST_BY_ID, postId] });

      // 2) 快照
      const previousInfinitePosts = queryClient.getQueryData([QUERY_KEYS.GET_INFINITE_POSTS]);
      const previousRecentPosts = queryClient.getQueryData([QUERY_KEYS.GET_RECENT_POSTS]);
      const previousPostById = queryClient.getQueryData([QUERY_KEYS.GET_POST_BY_ID, postId]);

      // 3) 真正乐观更新：Infinite 列表（带版本号）
      queryClient.setQueryData([QUERY_KEYS.GET_INFINITE_POSTS], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            documents: page.documents.map((doc: any) =>
              doc.$id === postId ? { ...doc, likes: likesArray, _likeVersion: version } : doc
            ),
          })),
        };
      });

      // 4) Recent 列表（如果页面也在用）
      queryClient.setQueryData([QUERY_KEYS.GET_RECENT_POSTS], (old: any) => {
        if (!old?.documents) return old;
        return {
          ...old,
          documents: old.documents.map((doc: any) =>
            doc.$id === postId ? { ...doc, likes: likesArray, _likeVersion: version } : doc
          ),
        };
      });

      // 5) 单帖详情
      queryClient.setQueryData([QUERY_KEYS.GET_POST_BY_ID, postId], (old: any) =>
        old ? { ...old, likes: likesArray, _likeVersion: version } : old
      );

      return { previousInfinitePosts, previousRecentPosts, previousPostById, postId, version };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData([QUERY_KEYS.GET_INFINITE_POSTS], ctx.previousInfinitePosts);
      queryClient.setQueryData([QUERY_KEYS.GET_RECENT_POSTS], ctx.previousRecentPosts);
      queryClient.setQueryData([QUERY_KEYS.GET_POST_BY_ID, ctx.postId], ctx.previousPostById);
    },

    onSuccess: (data, vars) => {
      // 防护：只有当响应的版本号 >= 当前缓存版本号时，才应用响应数据
      // 避免旧请求的响应覆盖新请求的乐观更新
      
      const currentInfinitePosts = queryClient.getQueryData([QUERY_KEYS.GET_INFINITE_POSTS]) as any;
      const currentRecentPosts = queryClient.getQueryData([QUERY_KEYS.GET_RECENT_POSTS]) as any;
      const currentPostById = queryClient.getQueryData([QUERY_KEYS.GET_POST_BY_ID, vars.postId]) as any;

      // 检查当前缓存中的版本号
      let targetVersion = 0;
      if (currentPostById?._likeVersion) {
        targetVersion = currentPostById._likeVersion;
      }

      // 只有当响应版本不低于目标版本时，才更新
      const shouldUpdate = vars.version >= targetVersion;

      if (!shouldUpdate) {
        // 旧版本的响应已到达，忽略它
        return;
      }

      // 应用响应数据
      queryClient.setQueryData([QUERY_KEYS.GET_INFINITE_POSTS], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            documents: page.documents.map((doc: any) =>
              doc.$id === vars.postId ? { ...doc, likes: data.likes, _likeVersion: vars.version } : doc
            ),
          })),
        };
      });

      queryClient.setQueryData([QUERY_KEYS.GET_RECENT_POSTS], (old: any) => {
        if (!old?.documents) return old;
        return {
          ...old,
          documents: old.documents.map((doc: any) =>
            doc.$id === vars.postId ? { ...doc, likes: data.likes, _likeVersion: vars.version } : doc
          ),
        };
      });

      queryClient.setQueryData([QUERY_KEYS.GET_POST_BY_ID, vars.postId], (old: any) =>
        old ? { ...old, likes: data.likes, _likeVersion: vars.version } : old
      );
    },

    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_INFINITE_POSTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_RECENT_POSTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_POST_BY_ID, vars.postId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_CURRENT_USER] });
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
        initialPageParam: "",
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