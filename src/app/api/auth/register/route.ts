import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export async function POST(req: Request) {
  try {
    const { email, username, password, fullName } = await req.json();
    if (!email || !username || !password || !fullName) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ tất cả các trường' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    const db = getDb();
    // Check if email or username already taken
    const existing = db.prepare(`
      SELECT id, email, username FROM users WHERE email = ? OR username = ?
    `).get(cleanEmail, cleanUsername) as { email: string; username: string } | undefined;

    if (existing) {
      if (existing.email === cleanEmail) {
        return NextResponse.json({ error: 'Email này đã được sử dụng' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Tên người dùng (username) này đã tồn tại' }, { status: 400 });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const userId = crypto.randomUUID();
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;

    db.prepare(`
      INSERT INTO users (id, email, username, password_hash, full_name, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, cleanEmail, cleanUsername, hash, fullName.trim(), avatarUrl);

    const newUser = {
      id: userId,
      email: cleanEmail,
      username: cleanUsername,
      full_name: fullName.trim(),
      avatar_url: avatarUrl,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Lỗi đăng ký tài khoản' }, { status: 500 });
  }
}
