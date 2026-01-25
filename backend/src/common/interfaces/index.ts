export interface IUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName?: string;
  dateOfBirth?: Date;
  imageUrl?: string;
  citizenId?: string;
  role: 'student' | 'teacher' | 'admin';
  walletAddress?: string;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserProfile {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  fullName?: string;
  dateOfBirth?: Date;
  imageUrl?: string;
  citizenId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJwtPayload {
  sub: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  iat?: number;
  exp?: number;
}
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

import type { Request } from 'express';
export interface IRequestWithUser extends Request {
  user: IUser;
}
