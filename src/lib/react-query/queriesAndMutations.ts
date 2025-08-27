import {
    useQuery,// fetch the data
    useMutation,// modify the data
    useQueryClient,
    useInfiniteQuery
} from '@tanstack/react-query';
import { createUserAccount, signInAccount } from '../appwrite/api';
import type { INewUser } from '@/types';

export const useCreateUserAccount =() =>{
    return useMutation({
        mutationFn: (newUser: INewUser) => createUserAccount(newUser)
})
}

export const useSignInAccount =() =>{
    return useMutation({
        mutationFn: (newUser: {email:string; password:string }) => signInAccount(newUser)
})
}