import React from 'react'
import { Typography, Space } from 'antd'
import {
  InfoCircleOutlined,
  FileImageOutlined,
  CloudOutlined,
  SafetyOutlined
} from '@ant-design/icons'
import type { UploadGuidelinesProps } from './UploadGuidelines.types'

const { Text } = Typography

export const UploadGuidelines: React.FC<UploadGuidelinesProps> = ({
  maxSize = '5MB',
  formats = ['JPG', 'PNG', 'GIF'],
  recommendedRatio = '1:1 (Square)',
  variant = 'default'
}) => {
  const guidelines = [
    {
      icon: <FileImageOutlined className="text-blue-500" />,
      text: `Supported formats: ${formats.join(', ')}`
    },
    {
      icon: <CloudOutlined className="text-green-500" />,
      text: `Maximum size: ${maxSize}`
    },
    {
      icon: <SafetyOutlined className="text-purple-500" />,
      text: `Recommended ratio: ${recommendedRatio}`
    }
  ]

  if (variant === 'compact') {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-3">
        <Space size={4} direction="vertical" className="w-full">
          {guidelines.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {item.icon}
              <Text className="text-xs text-slate-600">{item.text}</Text>
            </div>
          ))}
        </Space>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <InfoCircleOutlined className="text-blue-600" />
        <Text strong className="text-sm text-blue-900">
          Upload Guidelines
        </Text>
      </div>
      <Space size={8} direction="vertical" className="w-full">
        {guidelines.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="mt-0.5">{item.icon}</div>
            <Text className="text-sm text-slate-700">{item.text}</Text>
          </div>
        ))}
      </Space>
    </div>
  )
}
