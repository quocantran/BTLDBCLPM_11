'use client'

import { Form, Select } from 'antd'
import { Input, Button, Checkbox, Link } from '@/components/atoms'
import { RegisterFormProps, RegisterFormData } from './RegisterForm.types'

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  loading = false,
  error,
  className = ''
}) => {
  const [form] = Form.useForm<RegisterFormData>()

  const handleSubmit = async (values: RegisterFormData) => {
    onSubmit(values)
  }

  return (
    <Form
      form={form}
      onFinish={handleSubmit}
      layout="vertical"
      className={`space-y-6 ${className}`}
      initialValues={{ agreeToTerms: false }}
    >
      <Form.Item
        name="fullName"
        rules={[
          {
            required: true,
            message: 'Please enter your full name'
          },
          {
            min: 2,
            message: 'Full name must be at least 2 characters'
          },
          {
            whitespace: true,
            message: 'Full name cannot consist only of whitespace'
          }
        ]}
      >
        <Input id="fullName" placeholder="Full name" type="text" />
      </Form.Item>

      <Form.Item
        name="username"
        rules={[
          {
            required: true,
            message: 'Please enter your username'
          },
          {
            min: 2,
            message: 'Username must be at least 2 characters'
          },
          {
            whitespace: true,
            message: 'Username cannot consist only of whitespace'
          }
        ]}
      >
        <Input id="username" placeholder="Username" type="text" />
      </Form.Item>

      <Form.Item
        name="email"
        rules={[
          {
            required: true,
            message: 'Please enter your email'
          },
          {
            type: 'email',
            message: 'Invalid email address'
          }
        ]}
      >
        <Input id="email" placeholder="Email" type="email" />
      </Form.Item>

      <Form.Item
        name="role"
        rules={[
          {
            required: true,
            message: 'Please select a role'
          }
        ]}
      >
        <Select
          placeholder="Select a role"
          size="large"
          options={[
            { label: 'Student', value: 'student' },
            { label: 'Teacher', value: 'teacher' }
          ]}
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          {
            required: true,
            message: 'Please enter your password'
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
        <Input id="password" placeholder="Password" type="password" />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          {
            required: true,
            message: 'Please confirm your password'
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
          placeholder="Confirm password"
          type="password"
        />
      </Form.Item>

      <Form.Item
        name="agreeToTerms"
        valuePropName="checked"
        rules={[
          {
            validator: (_, value) =>
              value
                ? Promise.resolve()
                : Promise.reject(
                    new Error('You must agree to the terms and conditions')
                  )
          }
        ]}
      >
        <Checkbox
          id="agreeToTerms"
          label={
            <span>
              I agree to the{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-800">
                Terms & Conditions
              </Link>
            </span>
          }
        />
      </Form.Item>

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
          Create Account
        </Button>
      </Form.Item>
    </Form>
  )
}

export default RegisterForm
