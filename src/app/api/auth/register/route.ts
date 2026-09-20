import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getUserByUsername, saveUser, getAllUsers } from '@/lib/userService';

export async function POST(req: Request) {
  try {
    const { username, password, fullName, email } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Tên đăng nhập phải có ít nhất 3 ký tự' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 4 ký tự' },
        { status: 400 }
      );
    }

    const cleanFullName = (fullName && fullName.trim()) ? fullName.trim() : cleanUsername;
    const cleanEmail = (email && typeof email === 'string' && email.trim()) ? email.trim().toLowerCase() : null;

    // Kiểm tra tên đăng nhập đã tồn tại chưa
    const existing = getUserByUsername(cleanUsername);
    if (existing) {
      return NextResponse.json(
        { error: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.' },
        { status: 400 }
      );
    }

    // Nếu người dùng có nhập email, kiểm tra trùng email
    if (cleanEmail) {
      const allUsers = getAllUsers();
      const emailTaken = allUsers.some((u) => u.email && u.email.toLowerCase() === cleanEmail);
      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email này đã được sử dụng.' },
          { status: 400 }
        );
      }
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const userId = crypto.randomUUID();
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;

    const newUser = {
      id: userId,
      username: cleanUsername,
      password_hash: hash,
      full_name: cleanFullName,
      email: cleanEmail,
      avatar_url: avatarUrl,
      created_at: new Date().toISOString(),
    };

    // Lưu vào data/users.json và đồng bộ
    saveUser(newUser);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        full_name: newUser.full_name,
        email: newUser.email,
        avatar_url: newUser.avatar_url,
        created_at: newUser.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Lỗi đăng ký tài khoản trên máy chủ' }, { status: 500 });
  }
}
