import * as z from "zod";

export const SignValidation = z.object({
    name:z.string().min(2, {message:"too short"}),
    username: z.string().min(2, {message: "Username must be at least 2 characters.",}),
    email: z.string().email({message:"Invalid email address"}),
    password: z.string().min(6, {message:"Password must be at least 6 characters."}),
})