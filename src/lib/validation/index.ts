import * as z from "zod";

export const SignupValidation = z.object({
    name:z.string().min(2, {message:"too short"}),
    username: z.string().min(2, {message: "Username must be at least 2 characters.",}),
    email: z.string().email({message:"Invalid email address"}),
    password: z.string().min(8, {message:"Password must be at least 8 characters."}),
})

export const SigninValidation = z.object({
    email: z.string().email({message:"Invalid email address"}),
    password: z.string().min(8, {message:"Password must be at least 8 characters."}),
})

export const PostValidation = z.object({
    caption: z.string().max(2200, {message:"Caption must be at most 2200 characters."}),
    file: z.custom<File[]>(),
    location: z.string().max(30, {message:"Location must be at most 30 characters."}),
    tags: z.string().max(15, {message:"Tags must be at most 15 characters."}),
})

export const ProfileValidation = z.object({
    file:z.custom<File[]>(),
    email: z.string().email(),
    name: z.string().min(2, {message:"Name must be at least 2 characters."}),
    username: z.string().min(2, {message:"Username must be at least 2 characters."}),
    bio: z.string().max(150, {message:"Bio must be at most 150 characters."}),
})