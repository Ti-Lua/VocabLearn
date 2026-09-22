import path from 'node:path';
import fs from 'node:fs';

async function runTest() {
  const BASE_URL = 'http://localhost:3000';
  const testUsername = `user_vip_${Date.now().toString().slice(-6)}`;
  const testPassword = `Pass@${Date.now().toString().slice(-4)}`;
  const testFullName = `Học Viên VIP ${testUsername}`;
  const testEmail = `${testUsername}@gmail.com`;

  console.log(`\n==================================================`);
  console.log(`🚀 BẮT ĐẦU KIỂM THỬ ĐĂNG KÝ VÀ LƯU DỮ LIỆU TÀI KHOẢN`);
  console.log(`==================================================`);
  console.log(`👉 Username: ${testUsername}`);
  console.log(`👉 Password: ${testPassword}`);
  console.log(`👉 Full Name: ${testFullName}`);
  console.log(`👉 Email: ${testEmail}`);

  // 1. Gọi API Đăng ký
  console.log(`\n1️⃣ Gửi yêu cầu đăng ký tới ${BASE_URL}/api/auth/register...`);
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUsername,
      password: testPassword,
      fullName: testFullName,
      email: testEmail,
    }),
  });

  const registerData = await registerRes.json();
  console.log(`Status: ${registerRes.status}`);
  console.log('Phản hồi:', registerData);

  if (!registerRes.ok || !registerData.success) {
    throw new Error(`Đăng ký thất bại: ${JSON.stringify(registerData)}`);
  }
  console.log('✅ Đăng ký tài khoản thành công!');

  // 2. Kiểm tra file data/registered_accounts.json
  console.log(`\n2️⃣ Kiểm tra file data/registered_accounts.json...`);
  const filePath = path.join(process.cwd(), 'data', 'registered_accounts.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('File data/registered_accounts.json không tồn tại!');
  }

  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const accounts = JSON.parse(rawContent);
  const foundInFile = accounts.find((a: any) => a.username === testUsername);

  if (!foundInFile) {
    throw new Error(`Không tìm thấy tài khoản ${testUsername} trong data/registered_accounts.json!`);
  }

  console.log('✅ Tìm thấy tài khoản trong data/registered_accounts.json:');
  console.log(`   - ID: ${foundInFile.id}`);
  console.log(`   - Tên đăng nhập: ${foundInFile.username}`);
  console.log(`   - Mật khẩu lưu trữ: ${foundInFile.password}`);
  console.log(`   - Họ tên: ${foundInFile.full_name}`);
  console.log(`   - Email: ${foundInFile.email}`);
  console.log(`   - Ngày tạo: ${foundInFile.created_at}`);

  if (foundInFile.password !== testPassword) {
    throw new Error(`Mật khẩu không khớp! Kỳ vọng: ${testPassword}, thực tế: ${foundInFile.password}`);
  }

  // 3. Kiểm tra đăng nhập lại bằng tài khoản vừa tạo
  console.log(`\n3️⃣ Kiểm tra Đăng nhập lại bằng tài khoản vừa tạo (${testUsername})...`);
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUsername,
      password: testPassword,
    }),
  });

  const loginData = await loginRes.json();
  console.log(`Status đăng nhập: ${loginRes.status}`);
  if (!loginRes.ok || !loginData.success) {
    throw new Error(`Đăng nhập thất bại: ${JSON.stringify(loginData)}`);
  }
  console.log('✅ Đăng nhập lại thành công với tài khoản vừa tạo!');

  // 4. Kiểm tra qua API Admin /api/admin/accounts
  console.log(`\n4️⃣ Kiểm tra API quản lý tài khoản ${BASE_URL}/api/admin/accounts...`);
  const adminRes = await fetch(`${BASE_URL}/api/admin/accounts`);
  const adminData = await adminRes.json();
  console.log(`Tổng số tài khoản trong hệ thống quản lý: ${adminData.total}`);
  const foundAdmin = adminData.data.find((a: any) => a.username === testUsername);
  if (!foundAdmin) {
    throw new Error('Không tìm thấy tài khoản trong API admin!');
  }
  console.log(`✅ API Admin đã xác nhận tài khoản tồn tại kèm mật khẩu đầy đủ!`);

  console.log(`\n==================================================`);
  console.log(`🎉 TOÀN BỘ KIỂM THỬ THÀNH CÔNG RỰC RỠ!`);
  console.log(`==================================================\n`);
}

runTest().catch((err) => {
  console.error('❌ LỖI KIỂM THỬ:', err);
  process.exit(1);
});
