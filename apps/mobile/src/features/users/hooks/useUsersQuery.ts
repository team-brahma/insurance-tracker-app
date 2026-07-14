import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/UserService.js';
import type { RegisterDto } from '@repo/types';

export const userKeys = {
  all: ['users'] as const,
};

export function useUsersQuery() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: () => userService.getUsers(),
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
