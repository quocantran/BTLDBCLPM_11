export const resolveActiveSidebarItem = (path: string): string | null => {
  if (!path) return null

  const normalized = path.replace(/\/+$/, '') || '/'

  const routeMatchers: Array<{ id: string; pattern: RegExp }> = [
    { id: 'notifications', pattern: /\/dashboard\/notifications(\/|$)/ },
    { id: 'courses', pattern: /\/courses(\/|$)/ },
    { id: 'students', pattern: /\/students(\/|$)/ },
    { id: 'exams', pattern: /\/exams(\/|$)/ },
    { id: 'results', pattern: /\/results(\/|$)/ },
    { id: 'certificates', pattern: /\/certificates(\/|$)/ }
  ]

  const matchedRoute = routeMatchers.find(({ pattern }) =>
    pattern.test(normalized)
  )
  if (matchedRoute) return matchedRoute.id

  if (
    normalized === '/' ||
    /^\/dashboard(\/(teacher|student))?$/.test(normalized)
  ) {
    return 'dashboard'
  }

  return null
}
