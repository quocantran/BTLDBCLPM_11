'use client'

import { useRouter } from 'next/navigation'
import { Button } from 'antd'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center p-8">
        <div className="mb-8">
          <div className="text-6xl font-bold text-red-500 mb-4">403</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Không có quyền truy cập
          </h1>
          <p className="text-gray-600">
            Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị
            viên.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            type="primary"
            size="large"
            block
            onClick={() => router.back()}
          >
            Quay lại
          </Button>
          <Button size="large" block onClick={() => router.push('/')}>
            Về trang chủ
          </Button>
        </div>
      </div>
    </div>
  )
}
