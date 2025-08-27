import {
    useQuery,// fetch the data
    useMutation,// modify the data
    useQueryClient,
    useInfiniteQuery
} from '@tanstack/react-query';
import { createUserAccount } from '../appwrite/api';
import type { INewUser } from '@/types';

export const useCreateUserAccountMutation =() =>{
    return useMutation({
        mutationFn: (newUser: INewUser) => createUserAccount(newUser)
})
}