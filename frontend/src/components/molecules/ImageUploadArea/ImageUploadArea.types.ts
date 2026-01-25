import type { UploadProps, UploadFile } from 'antd'

export interface ImageUploadAreaProps {
  currentImageUrl?: string
  uploadProps: UploadProps
  fileList: UploadFile[]
  showGuidelines?: boolean
  guidelinesVariant?: 'default' | 'compact'
  layout?: 'vertical' | 'horizontal'
}
