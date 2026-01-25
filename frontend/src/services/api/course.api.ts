import {
  useMutation,
  type UseMutationOptions,
  type UseQueryOptions
} from '@tanstack/react-query'
import { CourseService } from '../index'

export interface CreateCourseRequest {
  courseName: string
  teacherId: string
}

export interface CourseEntity {
  id: string
  courseName: string
  publicId: string
  teacherId: string
  enrollmentCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateCourseResponse {
  success: boolean
  data: {
    course: CourseEntity
  }
  message: string
}

export interface TeacherCourseEntity extends CourseEntity {
  teacherName: string
}

export interface TeacherCoursesResponse {
  success: boolean
  data: {
    courses: TeacherCourseEntity[]
  }
  message: string
}

export interface DeleteCourseResponse {
  success: boolean
  message?: string
}

export interface TeacherCoursesQueryParams {
  search?: string
}

/**
 * Update course name request interface
 */
export interface UpdateCourseNameRequest {
  courseName: string
}

/**
 * Update course name response interface
 */
export interface UpdateCourseNameResponse {
  success: boolean
  data: {
    course: TeacherCourseEntity
  }
  message: string
}

/**
 * Variables for update course name mutation
 */
export interface UpdateCourseNameVariables {
  courseId: string
  data: UpdateCourseNameRequest
}

/**
 * Create a new course
 * POST /courses
 */
export const useCreateCourse = () => {
  return CourseService.usePost<CreateCourseResponse>({
    url: '/'
  })
}

export const useTeacherCourses = (
  teacherId?: string,
  queryParams?: TeacherCoursesQueryParams,
  options?: Omit<
    UseQueryOptions<TeacherCoursesResponse>,
    'queryKey' | 'queryFn'
  >
) => {
  // Build query string from params
  const buildQueryString = (params?: TeacherCoursesQueryParams): string => {
    if (!params) return ''
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
  }

  const queryString = buildQueryString(queryParams)

  return CourseService.useGet<TeacherCoursesResponse>({
    url: teacherId ? `/teacher/${teacherId}${queryString}` : '',
    options: {
      enabled: Boolean(teacherId),
      ...options
    }
  })
}

export const useDeleteCourse = () => {
  return CourseService.useDelete<DeleteCourseResponse>({
    url: '/delete'
  })
}

/**
 * Update course name
 * PATCH /courses/:courseId/name
 */
export const useUpdateCourseName = (
  options?: Omit<
    UseMutationOptions<
      UpdateCourseNameResponse,
      unknown,
      UpdateCourseNameVariables,
      unknown
    >,
    'mutationFn'
  >
) => {
  return useMutation({
    mutationFn: async ({ courseId, data }: UpdateCourseNameVariables) => {
      return CourseService.apiMethod.patch<UpdateCourseNameResponse>({
        url: `/${courseId}/name`,
        data
      })
    },
    ...options
  })
}
