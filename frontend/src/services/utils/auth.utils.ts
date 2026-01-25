/**
 * Helper: Set cookie
 */
const setCookie = (name: string, value: string, days = 7) => {
  if (typeof window === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

/**
 * Helper: Delete cookie
 */
const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

/**
 * Lưu access token (localStorage + cookie)
 */
export const saveAccessToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token)
    setCookie('access_token', token, 7)
  }
}

/**
 * Lưu refresh token (localStorage + cookie)
 */
export const saveRefreshToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('refresh_token', token)
    setCookie('refresh_token', token, 30)
  }
}

/**
 * Lưu user info
 */
export const saveUser = (user: any): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user))
  }
}

/**
 * Lấy user info
 */
export const getUser = (): any => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }
  return null
}

/**
 * Lưu cả 2 tokens + user
 */
export const saveTokens = (accessToken: string, refreshToken: string): void => {
  saveAccessToken(accessToken)
  saveRefreshToken(refreshToken)
}

/**
 * Lấy access token
 */
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/**
 * Lấy refresh token
 */
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refresh_token')
}

/**
 * Kiểm tra user đã đăng nhập chưa
 */
export const isAuthenticated = (): boolean => {
  return !!getAccessToken()
}

/**
 * Lấy role của user hiện tại
 */
export const getUserRole = (): 'student' | 'teacher' | null => {
  const user = getUser()
  return user?.role || null
}

/**
 * Check user có phải teacher không
 */
export const isTeacher = (): boolean => {
  return getUserRole() === 'teacher'
}

/**
 * Check user có phải student không
 */
export const isStudent = (): boolean => {
  return getUserRole() === 'student'
}

/**
 * Xóa tất cả dữ liệu authentication
 */
export const clearAuth = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    deleteCookie('access_token')
    deleteCookie('refresh_token')
  }
}

/**
 * Logout và xóa dữ liệu
 */
export const logout = (): void => {
  clearAuth()
  // Có thể thêm redirect ở đây nếu cần
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

// ==================== ERROR HANDLING ====================

/**
 * Parse error từ API response
 */
export const parseApiError = (err: any): string => {
  // Backend trả về error response (4xx, 5xx)
  if (err.response) {
    const backendError = err.response.data
    const status = err.response.status

    // Xử lý các loại error khác nhau dựa trên status code
    switch (status) {
      case 400:
        return backendError.message || 'Dữ liệu không hợp lệ'
      case 401:
        return backendError.message || 'Email hoặc mật khẩu không đúng'
      case 403:
        return backendError.message || 'Bạn không có quyền truy cập'
      case 404:
        return backendError.message || 'Không tìm thấy tài nguyên'
      case 409:
        return backendError.message || 'Dữ liệu đã tồn tại'
      case 422:
        return backendError.message || 'Dữ liệu không hợp lệ'
      case 429:
        return 'Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau'
      case 500:
      case 502:
      case 503:
        return 'Lỗi server. Vui lòng thử lại sau'
      default:
        return backendError.message || 'Có lỗi xảy ra. Vui lòng thử lại'
    }
  }

  // Request được gửi nhưng không nhận được response (network error)
  if (err.request) {
    return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng'
  }

  // Lỗi khác (config error, etc.)
  return err.message || 'Có lỗi xảy ra. Vui lòng thử lại'
}
