"use client";

import { Modal, Form, Input, DatePicker, Button, message, Spin } from "antd";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAuth } from "@/stores/auth";
import { useState } from "react";
import dayjs from "dayjs";
import { updateProfile } from "@/services/api/user.api";
import type {
  EditProfileModalProps,
  EditProfileFormData,
} from "./EditProfileModal.types";

// Validation schema
const editProfileSchema = yup.object({
  fullName: yup
    .string()
    .required("Full name is required")
    .min(2, "Full name must be at least 2 characters")
    .max(50, "Full name must not exceed 50 characters"),
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address"),
  dateOfBirth: yup
    .string()
    .required("Date of birth is required")
    .test("age", "You must be at least 16 years old", function (value: string) {
      if (!value) return false;
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        return age - 1 >= 16;
      }
      return age >= 16;
    }),
  citizenId: yup
    .string()
    .notRequired()
    .test("citizenId", "Citizen ID must be 9 or 12 digits", function (value) {
      if (!value || value === "") return true; // Optional field
      return /^[0-9]{9}$|^[0-9]{12}$/.test(value);
    }),
});

const EditProfileModal = ({
  isOpen,
  onClose,
  onSuccess,
}: EditProfileModalProps) => {
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditProfileFormData>({
    resolver: yupResolver(editProfileSchema) as any,
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      dateOfBirth: user?.dateOfBirth
        ? dayjs(user.dateOfBirth).format("YYYY-MM-DD")
        : "",
      citizenId: user?.citizenId,
    },
  });

  const onSubmit = async (data: EditProfileFormData) => {
    try {
      setIsLoading(true);

      const response = await updateProfile({
        fullName: data.fullName,
        email: data.email,
        dateOfBirth: data.dateOfBirth,
        citizenId: data.citizenId || undefined,
      });

      if (response.success) {
        setUser(response.data.user);
        message.success("Profile updated successfully!");
        onSuccess?.();
        onClose();
      } else {
        message.error(response.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Update profile error:", error);
      message.error(
        error.response?.data?.message ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      title="Edit Personal Information"
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <div className="space-y-4 mt-4">
          <Form.Item
            label="Full Name"
            validateStatus={errors.fullName ? "error" : ""}
            help={errors.fullName?.message}
          >
            <Controller
              name="fullName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter your full name"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Email"
            validateStatus={errors.email ? "error" : ""}
            help={errors.email?.message}
          >
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="email"
                  placeholder="Enter your email"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Date of Birth"
            validateStatus={errors.dateOfBirth ? "error" : ""}
            help={errors.dateOfBirth?.message}
          >
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => (
                <DatePicker
                  {...field}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) =>
                    field.onChange(date ? date.format("YYYY-MM-DD") : "")
                  }
                  placeholder="Select your date of birth"
                  size="large"
                  style={{ width: "100%" }}
                  format="YYYY-MM-DD"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Citizen ID"
            validateStatus={errors.citizenId ? "error" : ""}
            help={errors.citizenId?.message}
          >
            <Controller
              name="citizenId"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter your citizen ID (9 or 12 digits)"
                  size="large"
                  maxLength={12}
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
            {isLoading ? "Updating..." : "Update Profile"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EditProfileModal;
