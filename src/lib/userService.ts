import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { getDb } from './db';
import { getSupabaseAdmin } from './supabase';
import { getRegisteredAccounts, saveRegisteredAccount, updateRegisteredAccountPassword } from './accountManager';

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
 * Đọc toàn bộ danh sách tài khoản người dùng từ SQLite,
 * kết hợp dự phòng data/users.json và data/registered_accounts.json
 */
export function getAllUsers(): StoredUser[] {
  let users: StoredUser[] = [];

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
      users = dbUsers;
    }
  } catch (e) {
    console.warn('Đọc SQLite không khả dụng, sử dụng JSON fallback:', e);
  }

  // 2. Dự phòng: Đọc từ data/users.json
  if (fs.existsSync(USERS_FILE)) {
    try {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const fileUsers: StoredUser[] = JSON.parse(content);
      const userMap = new Map<string, StoredUser>();
      users.forEach((u) => userMap.set(u.username.toLowerCase(), u));
      fileUsers.forEach((u) => {
        if (!userMap.has(u.username.toLowerCase())) {
          userMap.set(u.username.toLowerCase(), u);
        }
      });
      users = Array.from(userMap.values());
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
      tmpUsers.forEach((u) => {
        if (!userMap.has(u.username.toLowerCase())) {
          userMap.set(u.username.toLowerCase(), u);
        }
      });
      users = Array.from(userMap.values());
    } catch (e) {
      console.warn('Lỗi đọc /tmp/users.json:', e);
    }
  }

  // 4. Dự phòng nguồn data riêng: data/registered_accounts.json
  try {
    const regAccounts = getRegisteredAccounts();
    const userMap = new Map<string, StoredUser>();
    users.forEach((u) => userMap.set(u.username.toLowerCase(), u));

    for (const acc of regAccounts) {
      const cleanName = acc.username.toLowerCase();
      if (!userMap.has(cleanName)) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(acc.password, salt);
        userMap.set(cleanName, {
          id: acc.id,
          username: acc.username,
          password_hash: hash,
          full_name: acc.full_name,
          display_name: acc.full_name,
          email: acc.email || null,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
          created_at: acc.created_at,
          updated_at: acc.updated_at,
          last_login_at: acc.last_login_at,
        });
      }
    }
    users = Array.from(userMap.values());
  } catch (e) {
    console.warn('Lỗi bổ sung từ registered_accounts:', e);
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
  const localFound = all.find((u) => u.id === id);
  if (localFound) return localFound;

  // Kiểm tra trong registered_accounts
  try {
    const regAccounts = getRegisteredAccounts();
    const foundReg = regAccounts.find((a) => a.id === id);
    if (foundReg) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(foundReg.password, salt);
      return {
        id: foundReg.id,
        username: foundReg.username,
        password_hash: hash,
        full_name: foundReg.full_name,
        display_name: foundReg.full_name,
        email: foundReg.email || null,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(foundReg.username)}`,
        created_at: foundReg.created_at,
        updated_at: foundReg.updated_at,
        last_login_at: foundReg.last_login_at,
      };
    }
  } catch {}

  return undefined;
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
  const localFound = users.find((u) => u.username.toLowerCase() === clean);
  if (localFound) return localFound;

  // Kiểm tra trong registered_accounts
  try {
    const regAccounts = getRegisteredAccounts();
    const foundReg = regAccounts.find((a) => a.username.toLowerCase() === clean);
    if (foundReg) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(foundReg.password, salt);
      return {
        id: foundReg.id,
        username: foundReg.username,
        password_hash: hash,
        full_name: foundReg.full_name,
        display_name: foundReg.full_name,
        email: foundReg.email || null,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(clean)}`,
        created_at: foundReg.created_at,
        updated_at: foundReg.updated_at,
        last_login_at: foundReg.last_login_at,
      };
    }
  } catch {}

  return undefined;
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
  const localFound = users.find(
    (u) =>
      u.username.toLowerCase() === clean ||
      (u.email && u.email.toLowerCase() === clean)
  );
  if (localFound) return localFound;

  // Kiểm tra trong registered_accounts
  try {
    const regAccounts = getRegisteredAccounts();
    const foundReg = regAccounts.find(
      (a) =>
        a.username.toLowerCase() === clean ||
        (a.email && a.email.toLowerCase() === clean)
    );
    if (foundReg) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(foundReg.password, salt);
      return {
        id: foundReg.id,
        username: foundReg.username,
        password_hash: hash,
        full_name: foundReg.full_name,
        display_name: foundReg.full_name,
        email: foundReg.email || null,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(foundReg.username)}`,
        created_at: foundReg.created_at,
        updated_at: foundReg.updated_at,
        last_login_at: foundReg.last_login_at,
      };
    }
  } catch {}

  return undefined;
}

/**
 * Tìm người dùng theo ID (có fallback Supabase Auth Cloud)
 */
export async function getUserByIdAsync(id: string): Promise<StoredUser | undefined> {
  const local = getUserById(id);
  if (local) return local;

  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;

  try {
    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (data?.user && !error) {
      const meta = data.user.user_metadata || {};
      const u: StoredUser = {
        id: data.user.id,
        username: meta.username || data.user.email?.split('@')[0] || 'user',
        password_hash: meta.password_hash || '',
        full_name: meta.full_name || 'Người dùng',
        display_name: meta.display_name || meta.full_name || 'Người dùng',
        email: data.user.email?.endsWith('@learnvocab.local') ? null : data.user.email,
        avatar_url: meta.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(meta.username || 'user')}`,
        created_at: data.user.created_at,
        updated_at: meta.updated_at,
        last_login_at: data.user.last_sign_in_at,
      };
      saveUser(u);
      return u;
    }
  } catch (e) {
    console.warn('Lỗi getUserByIdAsync từ Supabase Auth:', e);
  }
  return undefined;
}

/**
 * Tìm người dùng theo Identifier (có fallback Supabase Auth Cloud)
 */
export async function getUserByIdentifierAsync(identifier: string): Promise<StoredUser | undefined> {
  const local = getUserByIdentifier(identifier);
  if (local) return local;

  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;

  const clean = identifier.trim().toLowerCase();
  try {
    const { data, error } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (data?.users && !error) {
      const target = data.users.find((u) => {
        const meta = u.user_metadata || {};
        const uName = (meta.username || '').toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        return uName === clean || uEmail === clean;
      });

      if (target) {
        const meta = target.user_metadata || {};
        const u: StoredUser = {
          id: target.id,
          username: meta.username || target.email?.split('@')[0] || clean,
          password_hash: meta.password_hash || '',
          full_name: meta.full_name || target.email?.split('@')[0] || clean,
          display_name: meta.display_name || meta.full_name || clean,
          email: target.email?.endsWith('@learnvocab.local') ? null : target.email,
          avatar_url: meta.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(clean)}`,
          created_at: target.created_at,
          updated_at: meta.updated_at,
          last_login_at: target.last_sign_in_at,
        };
        saveUser(u);
        return u;
      }
    }
  } catch (e) {
    console.warn('Lỗi getUserByIdentifierAsync từ Supabase Auth:', e);
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

  // Cập nhật Supabase Auth user_metadata
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: updatedFullName,
          display_name: updatedFullName,
          avatar_url: updatedAvatar,
          updated_at: now,
        },
      }).catch(() => {});
    }
  } catch {}

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

  // Cập nhật mật khẩu trong file quản lý riêng registered_accounts.json
  updateRegisteredAccountPassword(userId, newPass);

  // Cập nhật lên Supabase Auth
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      supabase.auth.admin.updateUserById(userId, {
        password: newPass,
        user_metadata: {
          password_hash: newHash,
          managed_password: newPass,
          updated_at: now,
        },
      }).catch(() => {});
    }
  } catch {}

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
    try {
      fs.writeFileSync(USERS_FILE, content, 'utf-8');
    } catch {}
    try {
      fs.writeFileSync(TMP_USERS_FILE, content, 'utf-8');
    } catch {}
  } catch (e) {
    console.warn('Lỗi syncUserToJson:', e);
  }
}

/**
 * Lưu người dùng mới vào SQLite, JSON dự phòng, file registered_accounts riêng
 * và đồng bộ vĩnh viễn lên Supabase Auth Cloud (hoạt động bền vững trên cả Vercel)
 */
export function saveUser(newUser: StoredUser, plainPassword?: string): void {
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

  // 2. Ghi dự phòng vào data/users.json
  syncUserToJson(newUser);

  // 3. Ghi vào file quản lý riêng data/registered_accounts.json nếu có mật khẩu
  if (plainPassword) {
    saveRegisteredAccount({
      id: newUser.id,
      username: cleanUsername,
      password: plainPassword,
      full_name: newUser.full_name,
      email: newUser.email,
      created_at: now,
      role: 'user',
    });
  }

  // 4. Đồng bộ vĩnh viễn lên Supabase Auth Cloud (cho môi trường Vercel)
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const email = (newUser.email && newUser.email.includes('@'))
        ? newUser.email.toLowerCase()
        : `${cleanUsername}@learnvocab.local`;

      const authPassword = plainPassword || ('LearnVocab@' + cleanUsername + '2026!');

      supabase.auth.admin.createUser({
        email,
        password: authPassword,
        email_confirm: true,
        user_metadata: {
          id: newUser.id,
          username: cleanUsername,
          full_name: newUser.full_name,
          display_name: newUser.display_name || newUser.full_name,
          password_hash: newUser.password_hash,
          avatar_url: newUser.avatar_url || null,
          managed_password: plainPassword || undefined,
          created_at: now,
        },
      }).then(async ({ data, error }) => {
        if (error) {
          // Người dùng đã tồn tại trên Auth, cập nhật metadata
          const { data: list } = await supabase.auth.admin.listUsers();
          const existing = list?.users?.find(
            (u) =>
              u.email?.toLowerCase() === email ||
              u.user_metadata?.username?.toLowerCase() === cleanUsername
          );
          if (existing) {
            await supabase.auth.admin.updateUserById(existing.id, {
              user_metadata: {
                ...existing.user_metadata,
                full_name: newUser.full_name,
                display_name: newUser.display_name || newUser.full_name,
                password_hash: newUser.password_hash,
                avatar_url: newUser.avatar_url,
                managed_password: plainPassword || existing.user_metadata?.managed_password,
                updated_at: now,
              },
            });
            await supabase.from('user_stats').upsert({
              user_id: existing.id,
              updated_at: now,
            });
          }
        } else if (data?.user) {
          await supabase.from('user_stats').upsert({
            user_id: data.user.id,
            updated_at: now,
          });
        }
      }).catch((err) => {
        console.warn('Lỗi Supabase Auth sync:', err);
      });
    }
  } catch (e) {
    console.warn('Lỗi gọi Supabase từ saveUser:', e);
  }
}

