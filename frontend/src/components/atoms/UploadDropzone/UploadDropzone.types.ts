import type { UploadProps } from 'antd'

export interface UploadDropzoneProps {
  uploadProps: UploadProps
  showLabel?: boolean
  label?: string
  children?: React.ReactNode
}
