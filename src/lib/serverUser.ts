import { cookies } from 'next/headers';
import { PERSONAL_PROFILE_ID, PROFILES } from '@/config/personal';

/**
 * Lấy user_id hiện tại trên server từ searchParams, headers hoặc cookies
 */
export async function getActiveUserIdFromRequest(req?: Request): Promise<string> {
  if (req) {
    try {
      const url = new URL(req.url);
      const queryUser = url.searchParams.get('userId');
      if (queryUser && (queryUser === PROFILES.tilua.id || queryUser === PROFILES.tidieu.id)) {
        return queryUser;
      }
      const headerUser = req.headers.get('x-user-id');
      if (headerUser && (headerUser === PROFILES.tilua.id || headerUser === PROFILES.tidieu.id)) {
        return headerUser;
      }
    } catch {
      // Bỏ qua lỗi parse url
    }
  }

  try {
    const cookieStore = await cookies();
    const cookieId = cookieStore.get('learnvocab_active_user_id')?.value;
    if (cookieId && (cookieId === PROFILES.tilua.id || cookieId === PROFILES.tidieu.id)) {
      return cookieId;
    }
    const cookieProfile = cookieStore.get('learnvocab_active_profile')?.value;
    if (cookieProfile === 'tidieu') return PROFILES.tidieu.id;
    if (cookieProfile === 'tilua') return PROFILES.tilua.id;
  } catch {
    // Bỏ qua lỗi cookies ngoài request context
  }

  return PERSONAL_PROFILE_ID;
}
