import React from 'react'
import {
  ImagePreview,
  UploadDropzone,
  UploadGuidelines
} from '@/components/atoms'
import type { ImageUploadAreaProps } from './ImageUploadArea.types'

export const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  currentImageUrl,
  uploadProps,
  fileList,
  showGuidelines = true,
  guidelinesVariant = 'default',
  layout = 'vertical'
}) => {
  const isHorizontal = layout === 'horizontal'

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Current Image Preview */}
      {currentImageUrl && (
        <ImagePreview
          imageUrl={currentImageUrl}
          size="medium"
          label="Current Avatar"
        />
      )}

      {/* Upload Area */}
      <div
        className={
          isHorizontal ? 'flex items-start gap-4' : 'flex flex-col gap-4'
        }
      >
        <div className={isHorizontal ? 'flex-1' : 'w-full flow-root'}>
          <UploadDropzone
            uploadProps={uploadProps}
            label="Upload New Avatar"
            showLabel={true}
          >
            {fileList.length >= 1 ? null : undefined}
          </UploadDropzone>
        </div>

        {/* Guidelines - show on side if horizontal */}
        {showGuidelines && isHorizontal && (
          <div className="flex w-64 flex-shrink-0">
            <UploadGuidelines variant="compact" />
          </div>
        )}
      </div>

      {/* Guidelines - show below if vertical */}
      {showGuidelines && !isHorizontal && (
        <UploadGuidelines variant={guidelinesVariant} />
      )}
    </div>
  )
}
