/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'
import { API_SERVICES, getApiEndpoint } from './helper'
import { clearAuth, getRefreshToken, saveTokens } from './utils/auth.utils'
import type { AuthResponse } from './types/auth.types'
export interface Response<T> {
  records: T
  total_records: number
}

class AxiosClient {
  private readonly axiosInstance: AxiosInstance
  static instance: AxiosClient
  private retryCount = 0

  /** Track whether a token refresh is currently running to serialize retries. */
  private isRefreshing = false

  /** Callbacks waiting for the next token value after refresh completes. */
  private refreshSubscribers: Array<(token: string) => void> = []

  /** Absolute refresh endpoint to be used by the interceptor. */
  private readonly refreshEndpoint = `${getApiEndpoint(
    API_SERVICES.AUTH_SERVICE
  )}/refresh`

  static getInstance() {
    if (!AxiosClient.instance) {
      AxiosClient.instance = new AxiosClient()
    }
    return AxiosClient.instance
  }

  setAccessToken = (accessToken: string) => {
    window.localStorage.setItem('access_token', accessToken)
  }

  public constructor() {
    this.axiosInstance = axios.create({
      headers: {
        'content-type': 'application/json'
      }
    })

    this._initializeInterceptor()
  }

  private _initializeInterceptor = () => {
    this.axiosInstance.interceptors.request.use(this.handleRequest)
    this.axiosInstance.interceptors.response.use(
      this.handleResponse,
      this.handleError
    )
  }

  post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.axiosInstance.post(url, data, config)
  }

  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.get(url, config)
  }

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.put(url, data, config)
  }

  patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.axiosInstance.patch(url, data, config)
  }

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.delete(url, config)
  }

  private handleRequest = (config: InternalAxiosRequestConfig) => {
    // Danh sách các endpoints không cần token (public endpoints)
    const publicEndpoints = ['/auth/login', '/auth/register', '/auth/refresh']

    // Check nếu là public endpoint thì KHÔNG thêm token
    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      config.url?.includes(endpoint)
    )

    if (isPublicEndpoint) {
      return config
    }

    const token =
      window.localStorage.getItem('access_token') ??
      window.localStorage.getItem('auth_token')

    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }

  private handleResponse = (response: AxiosResponse) => {
    // if (
    //   !['application/json'].includes(response.headers['content-type'] as string)
    // )
    //   return response.data

    if (response.data) return response.data

    return response
  }

  /**
   * Axios response interceptor that transparently retries requests when the
   * API signals an expired access token. It leverages the refresh token to
   * obtain new credentials and replays waiting requests in sequence.
   */
  private handleError = async (error: any) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error)
    }

    // console.error('API error:', error)
    // console.log(originalRequest._retry)

    // if (
    //   originalRequest._retry ||
    //   originalRequest.url?.includes('/auth/login') ||
    //   originalRequest.url?.includes('/auth/register') ||
    //   originalRequest.url?.includes('/auth/refresh')
    // ) {
    this.dispatchSessionExpired()
    return Promise.reject(error)
    // }

    // const refreshToken = getRefreshToken()

    // if (!refreshToken) {
    //   this.dispatchSessionExpired()
    //   return Promise.reject(error)
    // }

    // if (this.isRefreshing) {
    //   return new Promise((resolve, reject) => {
    //     this.subscribeTokenRefresh((token: string) => {
    //       if (!token) {
    //         reject(error)
    //         return
    //       }

    //       if (originalRequest.headers) {
    //         originalRequest.headers.Authorization = `Bearer ${token}`
    //       }
    //       originalRequest._retry = true
    //       resolve(this.axiosInstance(originalRequest))
    //     })
    //   })
    // }

    // originalRequest._retry = true
    // this.isRefreshing = true

    // try {
    //   const refreshResponse = await axios.post<AuthResponse>(
    //     this.refreshEndpoint,
    //     {
    //       refreshToken
    //     },
    //     {
    //       headers: {
    //         'content-type': 'application/json'
    //       }
    //     }
    //   )

    //   const { data, success } = refreshResponse.data ?? refreshResponse

    //   if (!success || !data?.accessToken || !data?.refreshToken) {
    //     throw new Error('Invalid refresh response')
    //   }

    //   const { accessToken, refreshToken: newRefreshToken } = data

    //   saveTokens(accessToken, newRefreshToken)
    //   this.onRefreshed(accessToken)

    //   if (originalRequest.headers) {
    //     originalRequest.headers.Authorization = `Bearer ${accessToken}`
    //   }

    //   return this.axiosInstance(originalRequest)
    // } catch (refreshError) {
    //   this.onRefreshed('')
    //   clearAuth()
    //   this.dispatchSessionExpired()
    //   return Promise.reject(refreshError)
    // } finally {
    //   this.isRefreshing = false
    //   this.refreshSubscribers = []
    // }
  }

  /** Register a callback to run once a new token is available. */
  private subscribeTokenRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback)
  }

  /** Notify queued callbacks that a refresh attempt finished. */
  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => {
      callback(token)
    })
  }

  /** Emit the global session-expired event so UI layers can react. */
  private dispatchSessionExpired() {
    if (typeof window !== 'undefined') {
      const event = new Event('auth:session-expired')
      window.dispatchEvent(event)
    }
  }
}

export default AxiosClient.getInstance()
