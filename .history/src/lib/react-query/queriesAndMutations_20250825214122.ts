import {
    useQuery,
    useMutation,
    useQueryClient,
    useInfiniteQuery
} from '@tanstack/react-query';
import { createUserAccount } from '../appwrite/api';
import type { INewUser } from '@/types';

export const useCreateUserMutation =() =>{
    return useMutation({
        mutationFn: (newUser: INewUser) => createUserAccount(newUser)
})
}