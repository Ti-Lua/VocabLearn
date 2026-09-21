import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByIdentifier, getUserByIdentifierAsync, updateUserLastLogin } from '@/lib/userService';
import { signSessionToken, SESSION_COOKIE_NAME } from '@/lib/authSession';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu' }, { status: 400 });
    }

    let user = getUserByIdentifier(identifier);
    if (!user) {
      user = await getUserByIdentifierAsync(identifier);
    }
    if (!user) {
      return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không chính xác' }, { status: 401 });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không chính xác' }, { status: 401 });
    }

    // Cập nhật thời điểm đăng nhập cuối
    updateUserLastLogin(user.id);

    // Ký token phiên xác thực
    const sessionToken = signSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    const userPayload = {
      id: user.id,
      email: user.email || null,
      username: user.username,
      full_name: user.full_name,
      display_name: user.display_name || user.full_name,
      avatar_url: user.avatar_url || null,
      created_at: user.created_at,
    };

    const res = NextResponse.json({
      success: true,
      user: userPayload,
      token: sessionToken,
    });

    // Thiết lập cookie HttpOnly an toàn
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 ngày
    });

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống máy chủ' }, { status: 500 });
  }
}
