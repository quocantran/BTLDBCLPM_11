"use client";

import { Modal, Form, Input, Button, message } from "antd";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useState } from "react";
import { changePassword } from "@/services/api/auth.api";
import type {
  ChangePasswordModalProps,
  ChangePasswordFormData,
} from "./ChangePasswordModal.types";

// Validation schema
const changePasswordSchema = yup.object({
  currentPassword: yup
    .string()
    .required("Current password is required")
    .min(6, "Password must be at least 6 characters"),
  newPassword: yup
    .string()
    .required("New password is required")
    .min(8, "New password must be at least 8 characters"),
  confirmPassword: yup
    .string()
    .required("Please confirm your new password")
    .oneOf([yup.ref("newPassword")], "Passwords must match"),
});

const ChangePasswordModal = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: ChangePasswordModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ChangePasswordFormData>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      setIsLoading(true);

      const response = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (response?.success) {
        onSuccess?.();
        onClose();
        reset();
      } else {
        onError?.(response?.message || "Failed to change password");
      }
    } catch (error: any) {
      console.error("Change password error:", error);
      onError?.("Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="Change Password"
        open={isOpen}
        onCancel={handleCancel}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <div className="space-y-4 mt-4">
            <Form.Item
              label="Current Password"
              validateStatus={errors.currentPassword ? "error" : ""}
              help={errors.currentPassword?.message}
            >
              <Controller
                name="currentPassword"
                control={control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    placeholder="Enter your current password"
                    size="large"
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="New Password"
              validateStatus={errors.newPassword ? "error" : ""}
              help={errors.newPassword?.message}
            >
              <Controller
                name="newPassword"
                control={control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    placeholder="Enter your new password"
                    size="large"
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              validateStatus={errors.confirmPassword ? "error" : ""}
              help={errors.confirmPassword?.message}
            >
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    placeholder="Confirm your new password"
                    size="large"
                  />
                )}
              />
            </Form.Item>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <Button size="large" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isLoading}
              disabled={!isDirty}
            >
              {isLoading ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default ChangePasswordModal;
