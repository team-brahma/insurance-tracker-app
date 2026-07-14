import { httpClient } from '@services/HttpClient.js';
import type { ApiResponse, User, RegisterDto } from '@repo/types';

export const userService = {
  async getUsers(): Promise<ApiResponse<User[]>> {
    const { data } = await httpClient.get<ApiResponse<User[]>>('/api/v1/users');
    return data;
  },
  async createUser(dto: RegisterDto): Promise<ApiResponse<User>> {
    const { data } = await httpClient.post<ApiResponse<User>>('/api/v1/users', dto);
    return data;
  },
  async deleteUser(id: string): Promise<ApiResponse<{ message: string }>> {
    const { data } = await httpClient.delete<ApiResponse<{ message: string }>>(
      `/api/v1/users/${id}`,
    );
    return data;
  },
};
