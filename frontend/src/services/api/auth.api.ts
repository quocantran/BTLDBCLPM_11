import { AuthService } from '../index'
import type {
  ForgotPasswordResponse,
  LoginResponse,
  RegisterResponse,
  ResetPasswordResponse
} from '../types'

// ==================== AUTH API ENDPOINTS ====================

/**
 * Login API
 * POST /auth/login
 *
 * @example
 * const loginMutation = useLoginApi()
 * await loginMutation.mutateAsync({ data: { identifier, password } })
 */
export const useLoginApi = () => {
  return AuthService.usePost<LoginResponse>({
    url: '/login'
  })
}

/**
 * Register API
 * POST /auth/register
 *
 * @example
 * const registerMutation = useRegisterApi()
 * await registerMutation.mutateAsync({ data: { fullName, email, password, role } })
 */
export const useRegisterApi = () => {
  return AuthService.usePost<RegisterResponse>({
    url: '/register'
  })
}

/**
 * Forgot Password API
 * POST /auth/forgot-password
 *
 * @example
 * const forgotPasswordMutation = useForgotPasswordApi()
 * await forgotPasswordMutation.mutateAsync({ data: { email } })
 */
export const useForgotPasswordApi = () => {
  return AuthService.usePost<ForgotPasswordResponse>({
    url: '/forgot-password'
  })
}

/**
 * Reset Password API
 * POST /auth/reset-password
 */
export const useResetPasswordApi = () => {
  return AuthService.usePost<ResetPasswordResponse>({
    url: '/reset-password'
  })
}

/**
 * Logout API (optional - nếu backend có endpoint)
 * POST /auth/logout
 */
export const useLogoutApi = () => {
  return AuthService.usePost<{ success: boolean }>({
    url: '/logout'
  })
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordResponse {
  success: boolean
  message: string
}

/**
 * Change Password API
 * PUT /auth/change-password
 */
export const changePassword = async (
  data: ChangePasswordRequest
): Promise<ChangePasswordResponse> => {
  const response = await AuthService.apiMethod.post<ChangePasswordResponse>({
    url: '/change-password',
    data
  })
  return response
}
