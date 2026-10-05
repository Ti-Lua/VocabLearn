import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const db = new DatabaseSync(path.join(process.cwd(), 'data', 'learnvocab.db'));

db.exec('PRAGMA foreign_keys = OFF;');

// Update legacy demo-user-id to not conflict with email and username
db.prepare("UPDATE users SET username = 'tilua_legacy', email = 'demo_legacy@learnvocab.local' WHERE id = 'demo-user-id'").run();

// Check if 85c97771-538f-4532-a970-c9c9d82babe2 exists
const existing = db.prepare("SELECT * FROM users WHERE id = '85c97771-538f-4532-a970-c9c9d82babe2'").get();
if (!existing) {
  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, full_name, avatar_url)
    VALUES ('85c97771-538f-4532-a970-c9c9d82babe2', 'demo@learnvocab.local', 'tilua', '$2b$10$QNO0QffdZr5jN8HlOELU9uJWAtNg6ttwq1RQeutygc2YMCCmzBpSy', 'Tí Lửa', 'https://api.dicebear.com/7.x/bottts/svg?seed=tilua')
  `).run();
}

db.exec('PRAGMA foreign_keys = ON;');

console.log('Fixed users:');
const users = db.prepare("SELECT id, username, email FROM users WHERE username IN ('tilua', 'tidieu', 'tilua_legacy')").all();
console.log(users);
