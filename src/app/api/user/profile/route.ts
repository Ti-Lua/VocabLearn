import { NextResponse } from 'next/server';
import { getUserById, updateUserProfile, updateUserPassword } from '@/lib/userService';
import { getSessionFromCookies } from '@/lib/authSession';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookies();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || session?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
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
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Lỗi tải thông tin hồ sơ' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSessionFromCookies();
    const body = await req.json();
    const userId = body.userId || session?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const updated = updateUserProfile(userId, {
      full_name: body.full_name || body.fullName,
      email: body.email,
      avatar_url: body.avatar_url || body.avatarUrl,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Cập nhật thất bại' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email || null,
        username: updated.username,
        full_name: updated.full_name,
        display_name: updated.display_name || updated.full_name,
        avatar_url: updated.avatar_url || null,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi cập nhật hồ sơ' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSessionFromCookies();
    const body = await req.json();
    const userId = body.userId || session?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng điền mật khẩu hiện tại và mật khẩu mới' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 4 ký tự' }, { status: 400 });
    }

    const res = updateUserPassword(userId, oldPassword, newPassword);
    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Đổi mật khẩu thất bại' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi đổi mật khẩu' }, { status: 500 });
  }
}
