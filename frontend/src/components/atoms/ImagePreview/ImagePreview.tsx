import React from 'react'
import { Image, Typography } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import type { ImagePreviewProps } from './ImagePreview.types'

const { Text } = Typography

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  alt = 'Preview',
  size = 'medium',
  showLabel = true,
  label = 'Current Image'
}) => {
  if (!imageUrl) return null

  const sizeMap = {
    small: 80,
    medium: 120,
    large: 160
  }

  const dimension = sizeMap[size]

  return (
    <div className="space-x-4 flex items-center">
      {showLabel && (
        <Text strong className="text-slate-700">
          {label}
        </Text>
      )}
      <div className="flex-1">
        <Image
          src={imageUrl}
          alt={alt}
          width={dimension}
          height={dimension}
          className="rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
          preview={{
            mask: (
              <div className="flex flex-col items-center gap-2">
                <EyeOutlined className="text-xl" />
                <span className="text-xs">Preview</span>
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
