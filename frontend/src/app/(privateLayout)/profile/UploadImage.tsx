import { useState } from 'react'
import { Modal, Button, message, Image } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { ImageUploadArea } from '@/components/molecules'
import { updateProfile } from '@/services'
import { useAuth } from '@/stores/auth'
import * as faceapi from 'face-api.js'
import { useFaceApi } from '@/hooks/useFaceApi'
import './upload-image.css'

interface UploadImageProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess?: (imageUrl: string) => void
  currentImageUrl?: string
}

const getBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })

const UploadImage = ({
  isOpen,
  onClose,
  onUploadSuccess,
  currentImageUrl,
}: UploadImageProps) => {
  const { setUser } = useAuth()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewImage, setPreviewImage] = useState<string>('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  // Load models via custom hook
  const { modelsLoaded } = useFaceApi()

  // Handlers
  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList)
  }

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File)
    }
    setPreviewImage(file.url || (file.preview as string))
    setPreviewOpen(true)
  }

  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter((item) => item.uid !== file.uid)
    setFileList(newFileList)
  }

  const handleUpdateImageProfile = async (imageUrl: string) => {
    try {
      const response = await updateProfile({ imageUrl })
      if (response.success) {
        setUser(response.data.user)
        message.success('Avatar updated successfully!')
        onUploadSuccess?.(imageUrl)
        onClose()
      } else {
        message.error(response.message || 'Failed to update avatar')
      }
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || 'Failed to update profile. Please try again.'
      )
    }
  }

  // Local validation using face-api.js
  const validateImageLocally = async (file: File): Promise<boolean> => {
    if (!modelsLoaded) {
      messageApi.error('AI models are still loading. Please wait.')
      return false
    }

    setValidating(true)
    try {
      const img = document.createElement('img')
      const imageSrc = await getBase64(file)
      img.src = imageSrc
      await new Promise((resolve) => {
        img.onload = () => resolve(null)
        img.onerror = () => resolve(null)
      })

      // Detect faces with SsdMobilenetv1 for better accuracy
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptors()
      
      console.log('FaceAPI detections:', detections)

      if (!detections || detections.length === 0) {
        messageApi.error('No face detected. Please use a clear portrait photo.')
        return false
      }
      if (detections.length > 1) {
        messageApi.error('Multiple faces detected. Please use a photo with only yourself.')
        return false
      }

      const face = detections[0]
      if (face.detection.score < 0.8) {
        messageApi.error('Face is not clear enough. Please improve lighting or focus.')
        return false
      }

      const box = face.detection.box
      const imgCenter = img.width / 2
      const faceCenter = box.x + box.width / 2
      const allowedDeviation = img.width * 0.2

      if (Math.abs(faceCenter - imgCenter) > allowedDeviation) {
        messageApi.warning('Face is not centered. Please align your face in the middle.')
        return false
      }

      if (box.width < img.width * 0.2) {
        messageApi.error('Face is too small. Please move closer to the camera.')
        return false
      }

      messageApi.success('Photo looks good! Ready to upload.')
      return true
    } catch (err) {
      console.error('Face validation error:', err)
      messageApi.error('Error analyzing image. Please try another photo.')
      return false
    } finally {
      setValidating(false)
    }
  }

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please select an image to upload')
      return
    }
    const file = fileList[0]
    if (!file.originFileObj) {
      message.error('Invalid file')
      return
    }

    const isImage = file.originFileObj.type.startsWith('image/')
    if (!isImage) {
      message.error('Only image files are allowed!')
      return
    }

    const isLt5M = file.originFileObj.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!')
      return
    }

    // Validate locally with face-api
    const isValid = await validateImageLocally(file.originFileObj as File)
    if (!isValid) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file.originFileObj)
      formData.append('upload_preset', 'my_images')

      const response = await fetch(
        'https://api.cloudinary.com/v1_1/dl9mhhoqs/image/upload',
        { method: 'POST', body: formData }
      )

      const data = await response.json()
      if (data?.secure_url) {
        await handleUpdateImageProfile(data.secure_url)
      } else {
        throw new Error('Image upload failed.')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Upload failed. Please try again.'
      messageApi.error({
        content: errorMessage,
        duration: 10,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setFileList([])
    onClose()
  }

  const uploadProps: UploadProps = {
    name: 'image',
    listType: 'picture-card',
    fileList,
    onChange: handleChange,
    onPreview: handlePreview,
    onRemove: handleRemove,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/')
      if (!isImage) {
        message.error('Only image files are allowed!')
        return false
      }
      const isLt5M = file.size / 1024 / 1024 < 5
      if (!isLt5M) {
        message.error('Image must be smaller than 5MB!')
        return false
      }
      return false
    },
    maxCount: 1,
    accept: 'image/*',
  }

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-800">Upload Avatar</span>
          </div>
        }
        open={isOpen}
        onCancel={handleCancel}
        width={650}
        className="upload-image-modal"
        footer={
          <div className="flex justify-end gap-3 pt-4">
            <Button size="large" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={handleUpload}
              loading={uploading || validating}
              disabled={fileList.length === 0 || !modelsLoaded}
              className="min-w-[100px]"
            >
              {validating ? 'Analyzing...' : uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        }
      >
        <div className="py-4">
          <ImageUploadArea
            currentImageUrl={currentImageUrl}
            uploadProps={uploadProps}
            fileList={fileList}
            showGuidelines={true}
            guidelinesVariant="default"
            layout="vertical"
          />
        </div>
      </Modal>

      <Modal open={previewOpen} title="Preview Image" footer={null} onCancel={() => setPreviewOpen(false)} centered>
        <Image alt="preview" style={{ width: '100%' }} src={previewImage} preview={false} />
      </Modal>
    </>
  )
}

export default UploadImage