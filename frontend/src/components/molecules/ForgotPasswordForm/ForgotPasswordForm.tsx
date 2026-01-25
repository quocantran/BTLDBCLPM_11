'use client'

import { Form } from 'antd'
import { Input, Button } from '@/components/atoms'
import {
  type ForgotPasswordFormProps,
  type ForgotPasswordFormValues
} from './ForgotPasswordForm.types'

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSubmit,
  loading = false,
  error,
  successMessage,
  className = ''
}) => {
  const [form] = Form.useForm<ForgotPasswordFormValues>()

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    onSubmit(values)
  }

  return (
    <Form
      form={form}
      onFinish={handleSubmit}
      layout="vertical"
      className={`space-y-6 ${className}`}
    >
      <Form.Item
        name="email"
        rules={[
          {
            required: true,
            message: 'Please enter your email address'
          },
          {
            type: 'email',
            message: 'Please enter a valid email address'
          }
        ]}
      >
        <Input id="email" placeholder="Enter your email address" type="email" />
      </Form.Item>

      {successMessage && (
        <div className="text-sm text-green-700 text-center bg-green-50 p-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      <Form.Item className="mb-0">
        <Button
          htmlType="submit"
          variant="primary"
          size="large"
          fullWidth
          loading={loading}
        >
          Send reset link
        </Button>
      </Form.Item>
    </Form>
  )
}

export default ForgotPasswordForm
