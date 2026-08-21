// Profile service. ProfilePage updates profile (multipart), changes/sets password, and uploads an
// avatar. Real impl hits these endpoints; MSW intercepts in mock mode.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  mobile_number?: string;
  gender?: string;
  country?: string;
  timezone?: string;
}

export interface ChangePasswordPayload {
  new_password: string;
  old_password?: string;
}

export interface MessageResult {
  success: boolean;
  message: string;
  lockedUntil?: string;
}

export interface ImageUploadResult {
  success: boolean;
  message?: string;
  image_url?: string;
}

export interface ProfileService {
  updateProfile(payload: ProfileUpdatePayload): Promise<MessageResult>;
  changePassword(payload: ChangePasswordPayload): Promise<MessageResult>;
  uploadImage(file: File): Promise<ImageUploadResult>;
  deleteImage(): Promise<MessageResult>;
}

// Phase 11: these are mutations — the toast comes from the envelope `message`; uploadImage's
// `imageUrl` is in `data`. Re-assemble the existing service interfaces.
export const profileService: ProfileService = {
  updateProfile: async (payload) => {
    const body = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v != null) body.append(k, v);
    });
    const env = await http.full(endpoints.profile.update, { method: 'POST', body });
    return { success: true, message: env.message ?? '' };
  },
  changePassword: async (payload) => {
    const env = await http.full(endpoints.profile.changePassword, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { success: true, message: env.message ?? '' };
  },
  uploadImage: async (file) => {
    const body = new FormData();
    body.append('profile_image', file);
    const env = await http.full<{ imageUrl?: string }>(endpoints.profile.uploadImage, {
      method: 'POST',
      body,
    });
    return { success: true, message: env.message ?? undefined, image_url: env.data?.imageUrl };
  },
  deleteImage: async () => {
    const env = await http.full(endpoints.profile.deleteImage, {
      method: 'DELETE',
    });
    return { success: true, message: env.message ?? '' };
  },
};
