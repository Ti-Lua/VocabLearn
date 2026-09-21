import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById, getUserByIdAsync } from '@/lib/userService';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/authSession';

export async function GET(req: Request) {
  try {
    let token: string | undefined;

    // 1. Lấy token từ cookies
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    // 2. Nếu không có trong cookie, thử lấy từ header Authorization: Bearer <token>
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      }
    }

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = verifySessionToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ user: null });
    }

    let user = getUserById(payload.userId);
    if (!user) {
      user = await getUserByIdAsync(payload.userId);
    }
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email || null,
        username: user.username,
        full_name: user.full_name,
        display_name: user.display_name || user.full_name,
        avatar_url: user.avatar_url || null,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ user: null });
  }
}
