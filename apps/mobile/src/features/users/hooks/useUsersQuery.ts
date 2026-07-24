import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, type UserListParams } from '../services/UserService.js';
import type { RegisterDto } from '@repo/types';

export const userKeys = {
  all: ['users'] as const,
  list: (params?: UserListParams) => ['users', 'list', params] as const,
  infinite: (params?: UserListParams) => ['users', 'infinite', params] as const,
};

export function useUsersQuery(params?: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userService.getUsers(params),
  });
}

export function useInfiniteUsersQuery(params?: UserListParams) {
  return useInfiniteQuery({
    queryKey: userKeys.infinite(params),
    queryFn: ({ pageParam = 1 }) =>
      userService.getUsers({ ...params, page: pageParam, limit: params?.limit ?? 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: RegisterDto) => userService.createUser(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    meta: {
      successMessage: (variables: RegisterDto) => `User "${variables.name}" created successfully.`,
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    meta: {
      successMessage: 'User deleted successfully.',
    },
  });
}
