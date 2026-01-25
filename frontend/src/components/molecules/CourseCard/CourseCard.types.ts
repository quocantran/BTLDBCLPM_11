export interface CourseCardProps {
  courseName: string
  publicId: string
  teacherId: string
  teacherName: string
  enrollmentCount: number
  onDelete?: () => void
  isDeleting?: boolean
  /** Handler for edit action - triggers edit modal */
  onEdit?: () => void
  /** Loading state for edit action */
  isEditing?: boolean
  /** Handler for clicking on the course card - navigates to exams */
  onClick?: () => void
}
