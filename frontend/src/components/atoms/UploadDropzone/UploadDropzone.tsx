import React from 'react'
import { Upload, Typography } from 'antd'
import { CloudUploadOutlined } from '@ant-design/icons'
import type { UploadDropzoneProps } from './UploadDropzone.types'

const { Text } = Typography

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  uploadProps,
  showLabel = true,
  label = 'Upload New Image',
  children
}) => {
  // Check if there are files in the list
  const hasFiles = uploadProps.fileList && uploadProps.fileList.length > 0

  return (
    <div className="space-y-2">
      {showLabel && (
        <Text strong className="text-slate-700">
          {label}
        </Text>
      )}
      {!hasFiles ? (
        <Upload.Dragger
          {...uploadProps}
          className="upload-dropzone-custom"
          style={{ border: 'none', background: 'transparent' }}
        >
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-8 py-12 transition-all hover:border-blue-400 hover:bg-blue-50">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <CloudUploadOutlined className="text-3xl text-blue-600" />
            </div>
            <div className="text-center">
              <Text className="block text-base font-medium text-slate-700">
                Click or drag file to upload
              </Text>
              <Text className="block text-sm text-slate-500 mt-1">
                Support: JPG, PNG, GIF (Max 5MB)
              </Text>
            </div>
          </div>
        </Upload.Dragger>
      ) : (
        <Upload {...uploadProps} listType="picture">
          {children}
        </Upload>
      )}
    </div>
  )
}
