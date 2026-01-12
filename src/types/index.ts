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
  imageId: string;
  imageUrl: string;
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

// 定义 Creator 类型（匹配你数据库中 creator 字段的结构）
// export interface PostCreator {
//   $id: string; // creator 的用户 ID
//   name: string; // 用户名
//   imageUrl?: string; // 用户头像 URL（可选，因为可能有默认图）
//   // 其他 creator 相关字段（如 email、createdAt 等，根据你实际存储的内容添加）
// }

// // 定义自定义 Post 类型，继承 Models.Document（保留 id、createdAt 等基础字段）
// export interface Post extends Models.Document {
//   creator: PostCreator; // 你的自定义字段：创作者信息
//   caption: string; // 你的自定义字段：帖子描述
//   imageUrl: string; // 你的自定义字段：帖子图片 URL
//   imageId: string; // 你的自定义字段：图片在 Appwrite 存储中的 ID（可选，根据实际情况）
//   location?: string; // 你的自定义字段：位置（可选，因为可能为空）
//   tags: string[]; // 你的自定义字段：标签数组
//   likes: string[];
// }