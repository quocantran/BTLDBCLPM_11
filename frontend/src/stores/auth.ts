import { create } from "zustand";
import { getProfile } from "@/services/api/user.api";

export interface User {
  fullName?: string;
  id: string;
  username: string;
  email: string;
  dateOfBirth?: string;
  imageUrl?: string;
  citizenId?: string;
  role: "student" | "teacher";
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  getUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clearUser: () => set({ user: null, error: null, isLoading: false }),

  // Gọi API để lấy user info
  getUser: async () => {
    try {
      set({ isLoading: true, error: null });

      const data = await getProfile();

      if (data.success) {
        set({ user: data.data.user, isLoading: false });
      } else {
        set({ error: data.message, isLoading: false });
      }
    } catch (error: any) {
      console.error("Get user error:", error);

      // Token invalid → clear user
      if (error.response?.status === 401) {
        set({ user: null, error: null, isLoading: false });
      } else {
        set({ error: "Failed to get user", isLoading: false });
      }
    }
  },
}));
