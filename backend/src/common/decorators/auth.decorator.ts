import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Role-based access control decorator
 * @param roles - Array of allowed roles
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Public endpoint decorator - skip authentication
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * API operation decorator for Swagger documentation
 */
export const ApiOperation = (operation: {
  summary: string;
  description?: string;
}) => SetMetadata('swagger/apiOperation', operation);
