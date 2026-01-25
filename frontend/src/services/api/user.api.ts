import { AuthService } from "../index";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  dateOfBirth?: string;
  role: "student" | "teacher";
  createdAt: string;
  updatedAt: string;
}

export interface GetProfileResponse {
  success: boolean;
  data: {
    user: UserProfile;
  };
  message: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  dateOfBirth?: string;
  citizenId?: string;
  imageUrl?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  data: {
    user: UserProfile;
  };
  message: string;
}

/**
 * Get current user profile
 * GET /auth/profile
 */
export const getProfile = async (): Promise<GetProfileResponse> => {
  const response = await AuthService.apiMethod.get<GetProfileResponse>({
    url: "/profile",
  });
  return response;
};

/**
 * Update current user profile
 * PUT /auth/profile
 */
export const updateProfile = async (
  data: UpdateProfileRequest
): Promise<UpdateProfileResponse> => {
  const response = await AuthService.apiMethod.put<UpdateProfileResponse>({
    url: "/profile",
    data,
  });
  return response;
};

/**
 * Validate profile image
 * POST /auth/validate-profile-image
 */
export const validateProfileImage = async (
  imageBase64: string
): Promise<{ success: boolean; message: string }> => {
  const response = await AuthService.apiMethod.post<{
    success: boolean;
    message: string;
  }>({
    url: "/validate-profile-image",
    data: { imageBase64 },
  });
  return response;
};
