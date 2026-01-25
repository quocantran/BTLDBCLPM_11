import { useCallback, useMemo, useState } from 'react'
import { useDebounce } from './useDebounce'

export type ExamStatusFilter = 'all' | 'scheduled' | 'active' | 'completed'

export interface ExamFilters {
  search: string
  status: ExamStatusFilter
  /** Course ID filter - 'all' means show all courses */
  courseId: string
  page: number
  limit: number
}

export interface UseExamFiltersReturn {
  filters: ExamFilters
  debouncedSearch: string
  setSearch: (value: string) => void
  setStatus: (value: ExamStatusFilter) => void
  setCourseId: (value: string) => void
  setPage: (value: number) => void
  setLimit: (value: number) => void
  resetFilters: () => void
  queryParams: {
    search?: string
    status?: ExamStatusFilter
    courseId?: string
    page: number
    limit: number
  }
}

const DEFAULT_FILTERS: ExamFilters = {
  search: '',
  status: 'all',
  courseId: 'all', // Default to show all courses
  page: 1,
  limit: 10
}

export function useExamFilters(
  initialFilters?: Partial<ExamFilters>
): UseExamFiltersReturn {
  const [filters, setFilters] = useState<ExamFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  })

  // Debounce search input to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 300)

  const setSearch = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      search: value,
      page: 1 // Reset to first page when search changes
    }))
  }, [])

  const setStatus = useCallback((value: ExamStatusFilter) => {
    setFilters((prev) => ({
      ...prev,
      status: value,
      page: 1 // Reset to first page when filter changes
    }))
  }, [])

  /**
   * Set course filter
   * Resets to first page when filter changes
   */
  const setCourseId = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      courseId: value,
      page: 1 // Reset to first page when course filter changes
    }))
  }, [])

  const setPage = useCallback((value: number) => {
    setFilters((prev) => ({
      ...prev,
      page: value
    }))
  }, [])

  const setLimit = useCallback((value: number) => {
    setFilters((prev) => ({
      ...prev,
      limit: value,
      page: 1 // Reset to first page when limit changes
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  // Build query params for API call
  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
      // Include courseId in query params - 'all' means no filter
      courseId: filters.courseId !== 'all' ? filters.courseId : undefined,
      page: filters.page,
      limit: filters.limit
    }),
    [
      debouncedSearch,
      filters.status,
      filters.courseId,
      filters.page,
      filters.limit
    ]
  )

  return {
    filters,
    debouncedSearch,
    setSearch,
    setStatus,
    setCourseId,
    setPage,
    setLimit,
    resetFilters,
    queryParams
  }
}
