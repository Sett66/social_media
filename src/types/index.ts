import type { Models } from 'appwrite';

export type IContextType ={
  user: IUser;
  isLoading:boolean;
  setUser:React.Dispatch<React.SetStateAction<IUser>>;
  isAuthenticated:boolean;
  setIsAuthenticated:React.Dispatch<React.SetStateAction<boolean>>;
  checkAuthUser:()=>Promise<boolean>;
}
export type INavLink = {
  imgURL: string;
  route: string;
  label: string;
};

export type IUpdateUser = {
  userId: string;
  name: string;
  bio: string;
  imageId: string;
  imageUrl: URL | string;
  file: File[];
};

export type INewPost = {
  userId: string;
  caption: string;
  file: File[];
  location?: string;
  tags?: string;
};

export type IUpdatePost = {
  postId: string;
  caption: string;
  // 旧数据兼容（单图字段）
  imageId?: string;
  imageUrl?: string;

  // 新结构：多图字段（Appwrite 里将 imageUrl/imageId 改为数组）
  imageIds?: string[];
  imageUrls?: (string | URL)[];

  // 编辑时：最终“保留的旧图”（不需要重新上传）
  keptImageIds?: string[];
  keptImageUrls?: (string | URL)[];

  // 编辑时：需要从 storage 删除的旧图
  removedImageIds?: string[];
  file: File[];
  location?: string;
  tags?: string;
};

export type IUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  imageUrl: string;
  bio: string;
};

export type INewUser = {
  name: string;
  email: string;
  username: string;
  password: string;
};

// Post 类型（用于前端展示）
export interface PostCreator {
  $id: string;
  name: string;
  imageUrl?: string;
  username?: string;
}

export interface Post extends Models.Document {
  creator: PostCreator;
  caption: string;
  location?: string;
  tags: string[];
  likes: string[];

  // 旧结构（单图）：为了兼容历史数据
  imageUrl?: string;
  imageId?: string;

  // 新结构（多图）
  imageUrls?: (string | URL)[];
  imageIds?: string[];
}