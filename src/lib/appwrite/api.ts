import type { INewPost, INewUser, IUpdatePost, IUpdateUser } from "@/types";
import { account, appwriteConfig, avatars, databases, storage } from "./config"

import{ AppwriteException, ID, ImageGravity, Query, OAuthProvider } from 'appwrite'

export async function createUserAccount(user:INewUser){
   try{
    const newAccount = await account.create(
        ID.unique(),
        user.email,
        user.password,
        user.name,
    )

    if(!newAccount) throw Error;

    const avaterUrl = avatars.getInitials(user.name);//生成用户首字母头像
    const newUser = await saveUserToDB({
        accountId: newAccount.$id,
        email: newAccount.email,
        name: newAccount.name,
        username: user.username,
        imageUrl: avaterUrl,
    });

    return newUser;

   }catch(error){
    console.log(error);
    return error;
   }
}

export async function saveUserToDB(user:{
    accountId:string;
    email:string;
    name:string;
    imageUrl:string;
    username?:string;
}){
    try{
        const newUser= await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            user,
        )
        return newUser;
    }
    catch(error){
        console.log(error);
        return error;
    }
}

export async function signInAccount(user:{email:string ;password:string}){
    try{
        const session = await account.createEmailPasswordSession(user.email,user.password);
        return session;
    }catch(error){
        console.log(error);
        return error;
    }
}

export async function signOutAccount(){
    try{
        const session = await account.deleteSession('current');
        return session;
    }catch(error){
        console.log(error);
        return error;
    }
}

export async function getAccount() {
  try {
    const currentAccount = await account.get();

    return currentAccount;
  } catch (error) {
    console.log(error);
  }
}

export async function getCurrentUser(){
    try{
        const currentAccount = await getAccount();
        if(!currentAccount) throw Error;

        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [
                Query.equal('accountId',currentAccount.$id)
            ]
        )
        
        if(!currentUser || currentUser.total === 0) throw Error; 
        const userDoc: any = currentUser.documents[0];

        // Normalize liked posts' creator: if creator is an ID string, fetch the user document
        if (Array.isArray(userDoc?.liked) && userDoc.liked.length > 0) {
            try {
                const enrichedLiked = await Promise.all(
                    userDoc.liked.map(async (post: any) => {
                        if (post && typeof post.creator === 'string') {
                            try {
                                const creatorDoc = await databases.getDocument(
                                    appwriteConfig.databaseId,
                                    appwriteConfig.userCollectionId,
                                    post.creator
                                );
                                return { ...post, creator: creatorDoc };
                            } catch (_) {
                                return post;
                            }
                        }
                        return post;
                    })
                );
                userDoc.liked = enrichedLiked;
            } catch (_) {
                // swallow enrichment errors and return raw document
            }
        }

        return userDoc;
    }catch(error){
        console.log(error);
        return null;
    }
}

export async function createPost(post:INewPost){
    try{
        let imageIds: string[] = [];
        let imageUrls: (string | URL)[] = [];

        // 有文件时才上传；否则允许发“纯文字帖子”
        if (post.file && post.file.length > 0) {
            const uploadedFiles = await Promise.all(
                post.file.map(async (f) => {
                    const uploaded = await uploadFile(f);
                    if(!uploaded) throw Error("upload failed");
                    const url = await getFilePreview(uploaded.$id);
                    if(!url){
                        await deleteFile(uploaded.$id);
                        throw Error("no file url");
                    }
                    return { id: uploaded.$id, url };
                })
            );

            imageIds = uploadedFiles.map((x) => x.id);
            imageUrls = uploadedFiles.map((x) => x.url);
        }

        //convert tags in an array
        const tags = post.tags?.replace(/ /g, '').split(',')||[];
        // save to database
        const newPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            ID.unique(),
            {
                creator:post.userId,
                caption:post.caption,
                imageUrls,
                imageIds,
                location:post.location,
                tags:tags,
            }
        )
        if(!newPost) {
            // rollback: delete all uploaded files
            await Promise.all(imageIds.map((id) => deleteFile(id)));
            throw Error();
        }
        return newPost;
    }
    catch(error){
        console.log(error);
    }
}

export async function uploadFile( file:File){
    try{
        const uplaodedFile = await storage.createFile(
            appwriteConfig.storageId,
            ID.unique(),
            file,
        )
        // console.log('上传成功')
        return uplaodedFile;
    }
    catch(error){
        console.log(error);
    }
}

export function getFilePreview(fileId:string) {
    try{
    // 改用 getFileDownload 获取原始文件下载链接
    const fileUrl = storage.getFileDownload(
        appwriteConfig.storageId,
        fileId
    );
  
  if (!fileUrl) throw new Error("文件 URL 获取失败");
  return fileUrl;
} catch (error) {
  console.error("获取文件或文件 URL 时出错:", error);
  throw error;
}
}

export async function deleteFile(fileId:string){
    try {
        await storage.deleteFile(appwriteConfig.storageId,fileId);
        console.log('删除成功')
        return { status:'success' };
    } catch (error) {
        console.log(error);
    }
}

export async function getRecentPosts(){
    const posts = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.postCollectionId,
        [Query.orderDesc('$createdAt') ,Query.limit(20)]
    )
    if(!posts) throw Error;
    return posts;
}

export async function likePost(postId:string,likesArray:string[]){
    try{
        const updatedPost = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.postCollectionId,
        postId,{
            likes:likesArray
        }
        )
        if(!updatedPost) throw Error;
        return updatedPost
    }
    catch(error){
        console.log(error);
    }
    
}

export async function savePost(postId:string,userId:string){
    try{
        const updatedPost = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.savesCollectionId,
        ID.unique(),
        {
            post:postId,
            user:userId,
        }
        )
        if(!updatedPost) throw Error;
        return updatedPost
    }
    catch(error){
        console.log(error);
    }
}

export async function deleteSavedPost(savedPostId:string){
    try{
        const statusCode = await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.savesCollectionId,
        savedPostId
        )
        if(!statusCode) throw Error;
        return {status:'ok'}
    }
    catch(error){
        console.log(error);
    }
}

export async function getPostById(postId:string) {
    try{
        const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId
        )
        return post
    }catch(error){
        console.log(error)
    }
    
}

export async function updatePost(post:IUpdatePost){
    const hasFileToUpdate = post.file.length>0;

    try{
        // kept old images (after user removed some in UI)
        const keptImageIds =
            post.keptImageIds ??
            post.imageIds ??
            ((post as any).imageId ? [(post as any).imageId] : []);
        const keptImageUrls =
            post.keptImageUrls ??
            post.imageUrls ??
            ((post as any).imageUrl ? [(post as any).imageUrl] : []);

        let newUploaded: { id: string; url: URL }[] = [];
        if(hasFileToUpdate){
            newUploaded = await Promise.all(
                post.file.map(async (f) => {
                    const uploaded = await uploadFile(f);
                    if(!uploaded) throw Error("upload failed");
                    const url = await getFilePreview(uploaded.$id);
                    if(!url){
                        await deleteFile(uploaded.$id);
                        throw Error("no file url");
                    }
                    return { id: uploaded.$id, url };
                })
            );
        }

        const finalImageIds = [...keptImageIds, ...newUploaded.map((x) => x.id)];
        const finalImageUrls = [...keptImageUrls, ...newUploaded.map((x) => x.url)];

        //convert tags in an array
        const tags = post.tags?.replace(/ /g, '').split('#')||[];
        // save to database
        const updatedPost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            post.postId,
            {
                caption:post.caption,
                imageUrls:finalImageUrls as any,
                imageIds:finalImageIds,
                location:post.location,
                tags:tags,
            }
        )
        if(!updatedPost) {
            // rollback newly uploaded files
            if(newUploaded.length > 0){
                await Promise.all(newUploaded.map((x) => deleteFile(x.id)));
            }
            throw Error();
        }

        // delete removed old images (from storage)
        if(Array.isArray(post.removedImageIds) && post.removedImageIds.length > 0){
            await Promise.all(post.removedImageIds.map((id) => deleteFile(id)));
        }
        return updatedPost;
    }
    catch(error){
        console.log(error);
    }
}

export async function deletePost(postId:string, imageIds:string | string[]){
    if(!postId) throw Error;
    try{
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId
        )

        // best effort delete storage files
        const ids = Array.isArray(imageIds) ? imageIds : (imageIds ? [imageIds] : []);
        if(ids.length > 0){
            await Promise.all(ids.map((id) => deleteFile(id)));
        }
        return { status:'ok'}
    }catch(error){
        console.log(error);
    }
}

export async function getInfinitePosts({ pageParam }:{ pageParam:number}) {
    const queries: any[] = [Query.orderDesc(`$updatedAt`),Query.limit(10)]

    if(pageParam){ queries.push(Query.cursorAfter(pageParam.toString()));}

    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            queries
        )
        if(!posts) throw Error;
        return posts;
    } catch (error) {
        console.log(error)
    }
    
}

export async function searchPosts(searchTerm:string) {

    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            [Query.search('caption',searchTerm)]
        )
        if(!posts) throw Error;
        return posts;
    } catch (error) {
        console.log(error)
    }
    
}

export async function GetUsers(limit?:number){
    const queries: any[] = [Query.orderDesc(`$createdAt`)];
    if(limit){ queries.push(Query.limit(limit));}

    try {
        const users = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            queries
        );
        if(!users) throw Error;
        return users;
    }
    catch(error){
        console.log(error); 
    }
}

export async function GetUserById(userId:string) {
    try{
        const user = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            userId
        );
        if(!user) throw Error;
        return user;
    }
    catch(error){
        console.log(error);
    }
}

export async function updateUser(user:IUpdateUser){
    const hasFileToUpdate = user.file?.length>0;
    try{
        let image={
            imageUrl:user.imageUrl,
            imageId:user.userId
        }

        if(hasFileToUpdate){
            // Upload new file to appwrite storage
            const uploadedFile = await uploadFile(user.file[0]);
            if (!uploadedFile) throw Error();

            //get new file url??
            const fileUrl = getFilePreview(uploadedFile.$id);
            if(!fileUrl){
                await deleteFile(uploadedFile.$id);
                throw Error("No file URL");
            }

            image={...image, imageUrl:fileUrl, imageId:uploadedFile.$id};
        }

        //update User
        const updatedUser = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            user.userId,
            {
                name:user.name,
                bio:user.bio,
                imageUrl:image.imageUrl,
                imageId:image.imageId,
            }
        )

        //failed to update
        if(!updatedUser){
            //delete newly uploaded file
            if(hasFileToUpdate){
                await deleteFile(image.imageId);
            }
            throw Error;
        }
        if(user.imageId && hasFileToUpdate){
            await deleteFile(user.imageId);
        }
        return updatedUser;

    }
    catch(error){
        console.log(error);
    }
}

export async function getUserPosts(userId?: string) {
  if (!userId) return;

  try {
    const post = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
    );

    if (!post) throw Error;

    return post;
  } catch (error) {
    console.log(error);
  }
}

export async function createOAuth2Session(provider: OAuthProvider) {
  try {
    // GitHub 授权成功后，Appwrite 会根据这里的 URL 把用户带回前端
    const successUrl = `${window.location.origin}/oauth-callback`;
    const failureUrl = `${window.location.origin}/sign-in`;
    
    await account.createOAuth2Session(provider, successUrl, failureUrl);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// 处理 OAuth 回调：如果没有对应用户文档则自动创建
export async function handleOAuthCallback() {
  try {
    // 1. 确认 Appwrite 账户（此时 Session 应该已经存在）
    const currentAccount = await account.get();
    if (!currentAccount) {
      throw new Error('无法获取当前账户');
    }

    // 2. 尝试在数据库中查找用户文档
    const existingUsers = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('accountId', currentAccount.$id)]
    );

    if (existingUsers.total > 0) {
      // 已存在用户，直接返回
      return existingUsers.documents[0];
    }

    // 3. 第一次用 GitHub 登录：为其创建一条用户文档
    const baseName =
      (currentAccount.name && currentAccount.name.trim()) ||
      (currentAccount.email
        ? currentAccount.email.split('@')[0]
        : 'GitHub 用户');

    // username 尽量用邮箱前缀，退而求其次用 accountId 片段
    const baseUsername =
      (currentAccount.email
        ? currentAccount.email.split('@')[0]
        : `user_${currentAccount.$id.slice(0, 8)}`);

    const imageUrl = avatars.getInitials(baseName);

    const newUser = await saveUserToDB({
      accountId: currentAccount.$id,
      email: currentAccount.email,
      name: baseName,
      username: baseUsername,
      imageUrl,
    });

    return newUser;
  } catch (error) {
    console.log('处理 OAuth 回调失败', error);
    throw error;
  }
}