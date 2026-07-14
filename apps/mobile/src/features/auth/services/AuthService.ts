import { httpClient } from '@services/HttpClient.js';
import type { ApiResponse, User, LoginDto, RegisterDto } from '@repo/types';

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  login: (dto: LoginDto) => httpClient.post<ApiResponse<AuthResult>>('/api/v1/auth/login', dto),

  register: (dto: RegisterDto) =>
    httpClient.post<ApiResponse<AuthResult>>('/api/v1/auth/register', dto),

  refresh: (refreshToken: string) =>
    httpClient.post<ApiResponse<AuthResult>>('/api/v1/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) => httpClient.post('/api/v1/auth/logout', { refreshToken }),

  me: () => httpClient.get<ApiResponse<User>>('/api/v1/auth/me'),
};
