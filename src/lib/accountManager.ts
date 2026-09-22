import fs from 'node:fs';
import path from 'node:path';

export interface RegisteredAccount {
  id: string;
  username: string;
  password: string; // Mật khẩu dạng đọc được dành cho người quản trị
  full_name: string;
  email?: string | null;
  role?: string;
  created_at: string;
  updated_at?: string;
  last_login_at?: string;
  note?: string;
}

const REGISTERED_ACCOUNTS_FILE = path.join(process.cwd(), 'data', 'registered_accounts.json');
const TMP_REGISTERED_ACCOUNTS_FILE = path.join('/tmp', 'registered_accounts.json');

/**
 * Đọc danh sách tài khoản đã đăng ký (kèm mật khẩu quản lý)
 */
export function getRegisteredAccounts(): RegisteredAccount[] {
  let accounts: RegisteredAccount[] = [];

  // 1. Đọc từ data/registered_accounts.json (môi trường local hoặc git repository)
  if (fs.existsSync(REGISTERED_ACCOUNTS_FILE)) {
    try {
      const content = fs.readFileSync(REGISTERED_ACCOUNTS_FILE, 'utf-8');
      accounts = JSON.parse(content);
      if (Array.isArray(accounts)) return accounts;
    } catch (e) {
      console.warn('Lỗi đọc data/registered_accounts.json:', e);
    }
  }

  // 2. Dự phòng môi trường serverless: /tmp/registered_accounts.json
  if (fs.existsSync(TMP_REGISTERED_ACCOUNTS_FILE)) {
    try {
      const content = fs.readFileSync(TMP_REGISTERED_ACCOUNTS_FILE, 'utf-8');
      const tmpAccounts = JSON.parse(content);
      if (Array.isArray(tmpAccounts)) {
        return tmpAccounts;
      }
    } catch (e) {
      console.warn('Lỗi đọc /tmp/registered_accounts.json:', e);
    }
  }

  return accounts;
}

/**
 * Lưu hoặc cập nhật tài khoản vào file data/registered_accounts.json
 */
export function saveRegisteredAccount(account: RegisteredAccount): void {
  try {
    const accounts = getRegisteredAccounts();
    const cleanUsername = account.username.trim().toLowerCase();

    const existingIdx = accounts.findIndex(
      (a) => a.id === account.id || a.username.trim().toLowerCase() === cleanUsername
    );

    const now = new Date().toISOString();
    const accountToSave: RegisteredAccount = {
      ...account,
      username: cleanUsername,
      role: account.role || 'user',
      created_at: account.created_at || now,
      updated_at: now,
    };

    if (existingIdx >= 0) {
      accounts[existingIdx] = {
        ...accounts[existingIdx],
        ...accountToSave,
      };
    } else {
      accounts.push(accountToSave);
    }

    const jsonStr = JSON.stringify(accounts, null, 2);

    // Ghi vào data/registered_accounts.json
    try {
      const dataDir = path.dirname(REGISTERED_ACCOUNTS_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(REGISTERED_ACCOUNTS_FILE, jsonStr, 'utf-8');
    } catch (err) {
      // Trên Vercel production filesystem có thể là read-only
      console.warn('Không thể ghi vào data/registered_accounts.json (read-only):', err);
    }

    // Ghi vào /tmp/registered_accounts.json
    try {
      fs.writeFileSync(TMP_REGISTERED_ACCOUNTS_FILE, jsonStr, 'utf-8');
    } catch {}
  } catch (error) {
    console.error('Lỗi khi lưu tài khoản vào registered_accounts.json:', error);
  }
}

/**
 * Cập nhật mật khẩu trong registered_accounts.json
 */
export function updateRegisteredAccountPassword(userIdOrUsername: string, newPass: string): void {
  try {
    const accounts = getRegisteredAccounts();
    const cleanTarget = userIdOrUsername.trim().toLowerCase();

    const target = accounts.find(
      (a) => a.id === userIdOrUsername || a.username.toLowerCase() === cleanTarget
    );

    if (target) {
      target.password = newPass;
      target.updated_at = new Date().toISOString();
      const jsonStr = JSON.stringify(accounts, null, 2);

      try {
        fs.writeFileSync(REGISTERED_ACCOUNTS_FILE, jsonStr, 'utf-8');
      } catch {}
      try {
        fs.writeFileSync(TMP_REGISTERED_ACCOUNTS_FILE, jsonStr, 'utf-8');
      } catch {}
    }
  } catch (e) {
    console.warn('Lỗi cập nhật mật khẩu trong registered_accounts:', e);
  }
}
