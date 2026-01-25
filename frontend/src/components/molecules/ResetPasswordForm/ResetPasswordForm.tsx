'use client'

import { Form } from 'antd'
import { Input, Button } from '@/components/atoms'
import {
  ResetPasswordFormProps,
  ResetPasswordFormValues
} from './ResetPasswordForm.types'

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSubmit,
  loading = false,
  error,
  successMessage,
  disabled = false,
  className = ''
}) => {
  const [form] = Form.useForm<ResetPasswordFormValues>()

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    onSubmit(values)
  }

  return (
    <Form
      form={form}
      onFinish={handleSubmit}
      layout="vertical"
      className={`space-y-6 ${className}`}
      disabled={disabled}
    >
      <Form.Item
        name="password"
        rules={[
          {
            required: true,
            message: 'Please enter your new password'
          },
          {
            min: 6,
            message: 'Password must be at least 6 characters'
          },
          {
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            message: 'Password must include uppercase, lowercase, and a number'
          }
        ]}
      >
        <Input id="password" placeholder="New password" type="password" />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          {
            required: true,
            message: 'Please confirm your new password'
          },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve()
              }
              return Promise.reject(new Error('Passwords do not match'))
            }
          })
        ]}
      >
        <Input
          id="confirmPassword"
          placeholder="Confirm new password"
          type="password"
        />
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
          disabled={disabled}
        >
          Reset password
        </Button>
      </Form.Item>
    </Form>
  )
}

export default ResetPasswordForm
