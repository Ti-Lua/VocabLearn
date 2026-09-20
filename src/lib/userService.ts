import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './db';

export interface StoredUser {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  email?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const TMP_USERS_FILE = path.join('/tmp', 'users.json');

/**
 * Đọc toàn bộ danh sách tài khoản người dùng từ file data/users.json
 * và đồng bộ cùng /tmp/users.json trên môi trường serverless (Vercel)
 */
export function getAllUsers(): StoredUser[] {
  let users: StoredUser[] = [];

  // 1. Đọc từ data/users.json
  if (fs.existsSync(USERS_FILE)) {
    try {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      users = JSON.parse(content);
    } catch (e) {
      console.warn('Lỗi đọc data/users.json:', e);
    }
  }

  // 2. Nếu trên môi trường Serverless có /tmp/users.json, hợp nhất thêm người dùng mới
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

  // 3. Fallback: Nếu danh sách rỗng, thử đọc từ SQLite
  if (users.length === 0) {
    try {
      const db = getDb();
      const dbUsers = db.prepare('SELECT * FROM users').all() as unknown as StoredUser[];
      if (dbUsers && dbUsers.length > 0) {
        users = dbUsers;
      }
    } catch (e) {
      console.warn('Lỗi đọc fallback từ SQLite:', e);
    }
  }

  return users;
}

/**
 * Tìm người dùng theo tên đăng nhập (không phân biệt hoa thường)
 */
export function getUserByUsername(username: string): StoredUser | undefined {
  if (!username) return undefined;
  const clean = username.trim().toLowerCase();
  const users = getAllUsers();
  return users.find((u) => u.username.toLowerCase() === clean);
}

/**
 * Tìm người dùng theo username hoặc email (cho chức năng đăng nhập)
 */
export function getUserByIdentifier(identifier: string): StoredUser | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim().toLowerCase();
  const users = getAllUsers();
  return users.find(
    (u) =>
      u.username.toLowerCase() === clean ||
      (u.email && u.email.toLowerCase() === clean)
  );
}

/**
 * Lưu người dùng mới vào file data/users.json và SQLite
 */
export function saveUser(newUser: StoredUser): void {
  const users = getAllUsers();
  const cleanUsername = newUser.username.trim().toLowerCase();

  // Kiểm tra trùng
  const existingIdx = users.findIndex((u) => u.username.toLowerCase() === cleanUsername);
  if (existingIdx >= 0) {
    users[existingIdx] = newUser;
  } else {
    users.push(newUser);
  }

  const jsonContent = JSON.stringify(users, null, 2);

  // Ghi vào data/users.json (cục bộ / server)
  try {
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, jsonContent, 'utf-8');
  } catch (e) {
    console.warn('Không thể ghi data/users.json (có thể do môi trường read-only Vercel):', e);
  }

  // Luôn ghi thêm vào /tmp/users.json để Vercel serverless functions giữ được dữ liệu phiên
  try {
    fs.writeFileSync(TMP_USERS_FILE, jsonContent, 'utf-8');
  } catch {
    // Bỏ qua nếu môi trường không cho phép ghi /tmp
  }

  // Đồng bộ vào SQLite nếu SQLite mở được quyền ghi
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO users (id, email, username, password_hash, full_name, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        password_hash = excluded.password_hash,
        full_name = excluded.full_name,
        email = excluded.email
    `).run(
      newUser.id,
      newUser.email || null,
      newUser.username,
      newUser.password_hash,
      newUser.full_name,
      newUser.avatar_url || null,
      newUser.created_at
    );
  } catch (e) {
    console.warn('Đồng bộ SQLite thất bại (chuyển sang quản lý bằng data/users.json):', e);
  }
}
