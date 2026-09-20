import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByIdentifier } from '@/lib/userService';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu' }, { status: 400 });
    }

    const user = getUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không chính xác' }, { status: 401 });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không chính xác' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email || null,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url || null,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống máy chủ' }, { status: 500 });
  }
}
