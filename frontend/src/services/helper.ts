export enum API_SERVICES {
  TEST_SERVICE = 'test',
  AUTH_SERVICE = 'auth',
  EXAM_SERVICE = 'exams',
  COURSE_SERVICE = 'courses',
  CERTIFICATE_SERVICE = 'certificates',
  DASHBOARD_SERVICE = 'dashboard',
  NOTIFICATION_SERVICE = 'notifications'
}

export const getApiEndpoint = (service: API_SERVICES): string => {
  const isServer = typeof window === 'undefined'
  let endpoint = process.env.NEXT_PUBLIC_API_ENDPOINT
  if (isServer) {
    endpoint = process.env.NEXT_PUBLIC_API_INTERNAL_ENDPOINT
  }
  return `${endpoint}/${service}`
}
