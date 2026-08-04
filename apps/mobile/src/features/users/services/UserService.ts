import { httpClient } from '@services/HttpClient.js';
import type { ApiResponse, User, RegisterDto, UpdateUserDto } from '@repo/types';

export interface UserListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface PaginatedUsersResponse {
  data: User[];
  meta: UserListMeta;
}

export const userService = {
  async getUsers(params?: UserListParams): Promise<PaginatedUsersResponse> {
    const { data } = await httpClient.get<ApiResponse<User[]> & { meta?: UserListMeta }>('/api/v1/users', {
      params,
    });
    return {
      data: data.data,
      meta: data.meta ?? {
        total: data.data.length,
        page: 1,
        limit: data.data.length,
        totalPages: 1,
        hasNextPage: false,
      },
    };
  },
  async createUser(dto: RegisterDto): Promise<ApiResponse<User>> {
    const { data } = await httpClient.post<ApiResponse<User>>('/api/v1/users', dto);
    return data;
  },
  async updateUser(id: string, dto: UpdateUserDto): Promise<ApiResponse<User>> {
    const { data } = await httpClient.patch<ApiResponse<User>>(`/api/v1/users/${id}`, dto);
    return data;
  },
  async deleteUser(id: string): Promise<ApiResponse<{ message: string }>> {
    const { data } = await httpClient.delete<ApiResponse<{ message: string }>>(
      `/api/v1/users/${id}`,
    );
    return data;
  },
};
