import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { getDb } from './db';
import { getSupabaseAdmin } from './supabase';

export interface StoredUser {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  display_name?: string;
  email?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
  last_login_at?: string;
}

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const TMP_USERS_FILE = path.join('/tmp', 'users.json');

/**
 * Đọc toàn bộ danh sách tài khoản người dùng từ SQLite trước,
 * kết hợp dự phòng data/users.json
 */
export function getAllUsers(): StoredUser[] {
  // 1. Thử đọc từ SQLite (ưu tiên nguồn dữ liệu chính xác và cập nhật nhất)
  try {
    const db = getDb();
    const dbUsers = db.prepare(`
      SELECT 
        id, 
        username, 
        password_hash, 
        full_name, 
        COALESCE(display_name, full_name) as display_name,
        email, 
        avatar_url, 
        created_at,
        updated_at,
        last_login_at
      FROM users
    `).all() as unknown as StoredUser[];

    if (dbUsers && dbUsers.length > 0) {
      return dbUsers;
    }
  } catch (e) {
    console.warn('Đọc SQLite không khả dụng, sử dụng JSON fallback:', e);
  }

  let users: StoredUser[] = [];

  // 2. Dự phòng: Đọc từ data/users.json
  if (fs.existsSync(USERS_FILE)) {
    try {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      users = JSON.parse(content);
    } catch (e) {
      console.warn('Lỗi đọc data/users.json:', e);
    }
  }

  // 3. Dự phòng Serverless: /tmp/users.json
  if (fs.existsSync(TMP_USERS_FILE)) {
    try {
      const tmpContent = fs.readFileSync(TMP_USERS_FILE, 'utf-8');
      const tmpUsers: StoredUser[] = JSON.parse(tmpContent);
      const userMap = new Map<string, StoredUser>();
      users.forEach((u) => userMap.set(u.username.toLowerCase(), u));
      tmpUsers.forEach((u) => userMap.set(u.username.toLowerCase(), u));
      users = Array.from(userMap.values());
    } catch (e) {
      console.warn('Lỗi đọc /tmp/users.json:', e);
    }
  }

  return users;
}

/**
 * Tìm người dùng theo ID
 */
export function getUserById(id: string): StoredUser | undefined {
  if (!id) return undefined;
  try {
    const db = getDb();
    const user = db.prepare(`
      SELECT 
        id, 
        username, 
        password_hash, 
        full_name, 
        COALESCE(display_name, full_name) as display_name,
        email, 
        avatar_url, 
        created_at,
        updated_at,
        last_login_at
      FROM users 
      WHERE id = ?
    `).get(id) as StoredUser | undefined;
    if (user) return user;
  } catch (e) {
    console.warn('Lỗi getUserById từ SQLite:', e);
  }

  const all = getAllUsers();
  return all.find((u) => u.id === id);
}

/**
 * Tìm người dùng theo tên đăng nhập (không phân biệt hoa thường)
 */
export function getUserByUsername(username: string): StoredUser | undefined {
  if (!username) return undefined;
  const clean = username.trim().toLowerCase();
  try {
    const db = getDb();
    const user = db.prepare(`
      SELECT 
        id, 
        username, 
        password_hash, 
        full_name, 
        COALESCE(display_name, full_name) as display_name,
        email, 
        avatar_url, 
        created_at,
        updated_at,
        last_login_at
      FROM users 
      WHERE LOWER(username) = ?
    `).get(clean) as StoredUser | undefined;
    if (user) return user;
  } catch {
    // Fallback
  }

  const users = getAllUsers();
  return users.find((u) => u.username.toLowerCase() === clean);
}

/**
 * Tìm người dùng theo username hoặc email (cho chức năng đăng nhập)
 */
export function getUserByIdentifier(identifier: string): StoredUser | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim().toLowerCase();

  try {
    const db = getDb();
    const user = db.prepare(`
      SELECT 
        id, 
        username, 
        password_hash, 
        full_name, 
        COALESCE(display_name, full_name) as display_name,
        email, 
        avatar_url, 
        created_at,
        updated_at,
        last_login_at
      FROM users 
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(clean, clean) as StoredUser | undefined;
    if (user) return user;
  } catch {
    // Fallback
  }

  const users = getAllUsers();
  return users.find(
    (u) =>
      u.username.toLowerCase() === clean ||
      (u.email && u.email.toLowerCase() === clean)
  );
}

/**
 * Tìm người dùng theo ID (có fallback Supabase Cloud)
 */
export async function getUserByIdAsync(id: string): Promise<StoredUser | undefined> {
  const local = getUserById(id);
  if (local) return local;

  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (data && !error) {
      const u: StoredUser = {
        id: data.id,
        username: data.username,
        password_hash: data.password_hash,
        full_name: data.full_name,
        display_name: data.display_name || data.full_name,
        email: data.email,
        avatar_url: data.avatar_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_login_at: data.last_login_at,
      };
      saveUser(u);
      return u;
    }
  } catch (e) {
    console.warn('Lỗi getUserByIdAsync từ Supabase:', e);
  }
  return undefined;
}

/**
 * Tìm người dùng theo Identifier (có fallback Supabase Cloud)
 */
export async function getUserByIdentifierAsync(identifier: string): Promise<StoredUser | undefined> {
  const local = getUserByIdentifier(identifier);
  if (local) return local;

  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;

  const clean = identifier.trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.${clean},email.ilike.${clean}`)
      .maybeSingle();

    if (data && !error) {
      const u: StoredUser = {
        id: data.id,
        username: data.username,
        password_hash: data.password_hash,
        full_name: data.full_name,
        display_name: data.display_name || data.full_name,
        email: data.email,
        avatar_url: data.avatar_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_login_at: data.last_login_at,
      };
      saveUser(u);
      return u;
    }
  } catch (e) {
    console.warn('Lỗi getUserByIdentifierAsync từ Supabase:', e);
  }
  return undefined;
}

/**
 * Cập nhật thời điểm đăng nhập cuối
 */
export function updateUserLastLogin(userId: string): void {
  const now = new Date().toISOString();
  try {
    const db = getDb();
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, userId);
  } catch (e) {
    console.warn('Lỗi updateUserLastLogin SQLite:', e);
  }
}

/**
 * Cập nhật thông tin profile của người dùng
 */
export function updateUserProfile(
  userId: string,
  data: { full_name?: string; email?: string; avatar_url?: string }
): StoredUser | null {
  const existing = getUserById(userId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedFullName = data.full_name !== undefined ? data.full_name.trim() : existing.full_name;
  const updatedEmail = data.email !== undefined ? (data.email?.trim().toLowerCase() || null) : existing.email;
  const updatedAvatar = data.avatar_url !== undefined ? data.avatar_url : existing.avatar_url;

  try {
    const db = getDb();
    db.prepare(`
      UPDATE users 
      SET full_name = ?, display_name = ?, email = ?, avatar_url = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedFullName, updatedFullName, updatedEmail, updatedAvatar, now, userId);
  } catch (e) {
    console.warn('Lỗi cập nhật profile SQLite:', e);
  }

  existing.full_name = updatedFullName;
  existing.display_name = updatedFullName;
  existing.email = updatedEmail;
  existing.avatar_url = updatedAvatar;
  existing.updated_at = now;

  syncUserToJson(existing);
  return existing;
}

/**
 * Đổi mật khẩu an toàn
 */
export function updateUserPassword(
  userId: string,
  oldPass: string,
  newPass: string
): { success: boolean; error?: string } {
  const user = getUserById(userId);
  if (!user) return { success: false, error: 'Không tìm thấy người dùng' };

  const valid = bcrypt.compareSync(oldPass, user.password_hash);
  if (!valid) return { success: false, error: 'Mật khẩu hiện tại không đúng' };

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPass, salt);
  const now = new Date().toISOString();

  try {
    const db = getDb();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, userId);
  } catch (e) {
    console.warn('Lỗi cập nhật mật khẩu SQLite:', e);
  }

  user.password_hash = newHash;
  user.updated_at = now;
  syncUserToJson(user);
  return { success: true };
}

/**
 * Đồng bộ người dùng vào file JSON dự phòng
 */
function syncUserToJson(userToSync: StoredUser): void {
  try {
    let users: StoredUser[] = [];
    if (fs.existsSync(USERS_FILE)) {
      try {
        users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      } catch {
        users = [];
      }
    }
    const idx = users.findIndex((u) => u.id === userToSync.id);
    if (idx >= 0) {
      users[idx] = userToSync;
    } else {
      users.push(userToSync);
    }
    const content = JSON.stringify(users, null, 2);
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(USERS_FILE, content, 'utf-8');
    try {
      fs.writeFileSync(TMP_USERS_FILE, content, 'utf-8');
    } catch {}
  } catch (e) {
    console.warn('Lỗi syncUserToJson:', e);
  }
}

/**
 * Lưu người dùng mới vào SQLite và đồng bộ JSON dự phòng
 */
export function saveUser(newUser: StoredUser): void {
  const cleanUsername = newUser.username.trim().toLowerCase();
  const now = newUser.created_at || new Date().toISOString();

  // 1. Lưu/cập nhật vào SQLite
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO users (id, email, username, password_hash, full_name, display_name, avatar_url, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        password_hash = excluded.password_hash,
        full_name = excluded.full_name,
        display_name = excluded.display_name,
        email = excluded.email,
        updated_at = excluded.updated_at
    `).run(
      newUser.id,
      newUser.email || null,
      cleanUsername,
      newUser.password_hash,
      newUser.full_name,
      newUser.display_name || newUser.full_name,
      newUser.avatar_url || null,
      now,
      now,
      now
    );

    // Khởi tạo bảng user_stats nếu chưa có
    db.prepare(`
      INSERT OR IGNORE INTO user_stats (user_id, updated_at)
      VALUES (?, ?)
    `).run(newUser.id, now);
  } catch (e) {
    console.warn('Đồng bộ SQLite thất bại:', e);
  }

  // 2. Ghi dự phòng vào JSON
  syncUserToJson(newUser);

  // 3. Đồng bộ vĩnh viễn lên Supabase Cloud (cho môi trường Vercel)
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      supabase.from('users').upsert({
        id: newUser.id,
        email: newUser.email || null,
        username: cleanUsername,
        password_hash: newUser.password_hash,
        full_name: newUser.full_name,
        avatar_url: newUser.avatar_url || null,
        created_at: now,
        updated_at: now,
        last_login_at: now,
      }).then(({ error }) => {
        if (error) console.warn('Supabase sync user error:', error.message);
      });

      supabase.from('user_stats').upsert({
        user_id: newUser.id,
        updated_at: now,
      }).then(() => {});
    }
  } catch (e) {
    console.warn('Lỗi gọi Supabase từ saveUser:', e);
  }
}
