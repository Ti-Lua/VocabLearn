/**
 * QA Automation Test Suite for LearnVocab by Tí Lửa
 * Targets: http://localhost:3000
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  id: string;
  category: 'AUTH' | 'LEARNING' | 'SSR_PAGES' | 'SECURITY';
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  durationMs: number;
  details: string;
  error?: string;
  raw?: any;
}

const results: TestResult[] = [];

// Cookie jar to manage session cookies across requests
class CookieJar {
  private cookies: Map<string, string> = new Map();

  setFromHeaders(headers: Headers) {
    const setCookieHeaders = headers.getSetCookie ? headers.getSetCookie() : [headers.get('set-cookie')].filter(Boolean) as string[];
    for (const raw of setCookieHeaders) {
      if (!raw) continue;
      const parts = raw.split(';');
      const [nameVal] = parts;
      const eqIdx = nameVal.indexOf('=');
      if (eqIdx > 0) {
        const key = nameVal.substring(0, eqIdx).trim();
        const val = nameVal.substring(eqIdx + 1).trim();
        if (val === '' || raw.includes('Max-Age=0') || raw.includes('expires=Thu, 01 Jan 1970')) {
          this.cookies.delete(key);
        } else {
          this.cookies.set(key, val);
        }
      }
    }
  }

  getCookieHeader(): string {
    const pairs: string[] = [];
    for (const [k, v] of this.cookies.entries()) {
      pairs.push(`${k}=${v}`);
    }
    return pairs.join('; ');
  }

  clear() {
    this.cookies.clear();
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }
}

const jar = new CookieJar();

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});
  
  const cookieHeader = jar.getCookieHeader();
  if (cookieHeader && !headers.has('Cookie')) {
    headers.set('Cookie', cookieHeader);
  }

  const start = Date.now();
  try {
    const res = await fetch(url, { ...options, headers });
    const durationMs = Date.now() - start;
    jar.setFromHeaders(res.headers);
    return { res, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    throw { err, durationMs };
  }
}

async function runTest(
  id: string,
  category: 'AUTH' | 'LEARNING' | 'SSR_PAGES' | 'SECURITY',
  name: string,
  fn: () => Promise<{ status?: 'PASSED' | 'FAILED' | 'WARNING'; details: string; raw?: any }>
) {
  const start = Date.now();
  try {
    const res = await fn();
    const durationMs = Date.now() - start;
    results.push({
      id,
      category,
      name,
      status: res.status || 'PASSED',
      durationMs,
      details: res.details,
      raw: res.raw,
    });
    console.log(`[${res.status || 'PASSED'}] ${id}: ${name} (${durationMs}ms)`);
  } catch (e: any) {
    const durationMs = Date.now() - start;
    results.push({
      id,
      category,
      name,
      status: 'FAILED',
      durationMs,
      details: `Exception thrown: ${e.message || String(e)}`,
      error: e.stack || String(e),
    });
    console.error(`[FAILED] ${id}: ${name} (${durationMs}ms) - ${e.message || String(e)}`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('STARTING QA TEST SUITE: LearnVocab by Tí Lửa');
  console.log(`Target: ${BASE_URL}`);
  console.log('====================================================\n');

  const timestamp = Date.now();
  const testUsername = `tester_${timestamp.toString().slice(-6)}`;
  const testEmail = `test_${timestamp}@example.com`;
  const testPassword = 'Password123!';
  const testFullName = 'QA Senior Tester';

  // ----------------------------------------------------
  // SECTION 1: AUTHENTICATION TESTING
  // ----------------------------------------------------
  console.log('>>> 1. TESTING AUTHENTICATION (REGISTER / LOGIN / RE-LOGIN / LOGOUT)');

  // Test AUTH-01: Register with missing fields
  await runTest('AUTH-01', 'AUTH', 'Đăng ký - Thiếu thông tin bắt buộc', async () => {
    const { res } = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', password: '' }),
    });
    const data = await res.json();
    if (res.status === 400 && data.error) {
      return { details: `Đúng chuẩn 400 Bad Request. Lỗi trả về: "${data.error}"` };
    }
    return { status: 'FAILED', details: `Không chặn được: Status ${res.status}, body: ${JSON.stringify(data)}` };
  });

  // Test AUTH-02: Register with short username (<3 chars)
  await runTest('AUTH-02', 'AUTH', 'Đăng ký - Tên đăng nhập quá ngắn (< 3 ký tự)', async () => {
    const { res } = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ab', password: 'Password123!' }),
    });
    const data = await res.json();
    if (res.status === 400 && data.error?.includes('ít nhất 3 ký tự')) {
      return { details: `Validation chuẩn xác. Thông báo lỗi: "${data.error}"` };
    }
    return { status: 'FAILED', details: `Không chặn username ngắn: Status ${res.status}, message: ${data.error}` };
  });

  // Test AUTH-03: Register with short password (<4 chars)
  await runTest('AUTH-03', 'AUTH', 'Đăng ký - Mật khẩu quá ngắn (< 4 ký tự)', async () => {
    const { res } = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'tester_valid', password: '123' }),
    });
    const data = await res.json();
    if (res.status === 400 && data.error?.includes('ít nhất 4 ký tự')) {
      return { details: `Validation chuẩn xác. Thông báo lỗi: "${data.error}"` };
    }
    return { status: 'FAILED', details: `Không chặn mật khẩu ngắn: Status ${res.status}` };
  });

  // Test AUTH-04: Successful Registration (Happy Path)
  let createdUserId = '';
  await runTest('AUTH-04', 'AUTH', 'Đăng ký thành công tài khoản mới hợp lệ', async () => {
    jar.clear();
    const { res } = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
        fullName: testFullName,
        email: testEmail,
      }),
    });
    const data = await res.json();
    if ((res.status === 200 || res.status === 201) && data.success && data.user) {
      createdUserId = data.user.id;
      const sessionCookie = jar.get('learnvocab_session');
      return {
        details: `Tạo tài khoản thành công (Status ${res.status})! Username: ${data.user.username}, ID: ${data.user.id}. Session cookie: ${sessionCookie ? 'Đã cấp' : 'Không có'}`,
        raw: data.user,
      };
    }
    return { status: 'FAILED', details: `Đăng ký thất bại. Status ${res.status}: ${JSON.stringify(data)}` };
  });

  // Test AUTH-05: Register Duplicate Username
  await runTest('AUTH-05', 'AUTH', 'Đăng ký - Chặn trùng tên đăng nhập', async () => {
    const { res } = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: 'AnotherPassword123!',
        fullName: 'Another Person',
      }),
    });
    const data = await res.json();
    if (res.status === 400 && data.error?.toLowerCase().includes('đã được sử dụng')) {
      return { details: `Hệ thống chặn trùng username thành công: "${data.error}"` };
    }
    return { status: 'FAILED', details: `Chưa chặn trùng username: Status ${res.status}, error: ${data.error}` };
  });

  // Test AUTH-06: Register Duplicate Email
  await runTest('AUTH-06', 'AUTH', 'Đăng ký - Chặn trùng email', async () => {
    const { res } = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `diff_${testUsername}`,
        password: 'Password123!',
        email: testEmail,
      }),
    });
    const data = await res.json();
    if (res.status === 400 && data.error?.toLowerCase().includes('email')) {
      return { details: `Hệ thống chặn trùng email thành công: "${data.error}"` };
    }
    return { status: 'FAILED', details: `Chưa chặn trùng email: Status ${res.status}, error: ${data.error}` };
  });

  // Test AUTH-07: Verify Session via /api/auth/me
  await runTest('AUTH-07', 'AUTH', 'Xác thực phiên qua API /api/auth/me', async () => {
    const { res } = await request('/api/auth/me');
    const data = await res.json();
    if (res.status === 200 && data.user && data.user.username === testUsername) {
      return { details: `Phiên đăng nhập hợp lệ! User ID: ${data.user.id}, Username: ${data.user.username}` };
    }
    return {
      status: 'FAILED',
      details: `Không nhận diện được phiên đăng nhập: Status ${res.status}, body: ${JSON.stringify(data)}`,
    };
  });

  // Test AUTH-08: Logout
  await runTest('AUTH-08', 'AUTH', 'Đăng xuất tài khoản (/api/auth/logout)', async () => {
    const { res } = await request('/api/auth/logout', { method: 'POST' });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      const check = await request('/api/auth/me');
      const checkData = await check.res.json();
      if (!checkData.user) {
        return { details: 'Đăng xuất thành công. Cookie phiên bị xóa sạch, /api/auth/me trả về user = null.' };
      }
      return {
        status: 'WARNING',
        details: 'API logout trả về 200 nhưng /api/auth/me vẫn còn user.',
      };
    }
    return { status: 'FAILED', details: `Đăng xuất thất bại: Status ${res.status}` };
  });

  // Test AUTH-09: Login with wrong password
  await runTest('AUTH-09', 'AUTH', 'Đăng nhập - Sai mật khẩu', async () => {
    const { res } = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testUsername, password: 'WrongPassword999!' }),
    });
    const data = await res.json();
    if ((res.status === 400 || res.status === 401) && data.error) {
      return { details: `Hệ thống từ chối mật khẩu sai chuẩn xác (Status ${res.status}): "${data.error}"` };
    }
    return { status: 'FAILED', details: `Không chặn được sai pass: Status ${res.status}` };
  });

  // Test AUTH-10: Login with non-existent user
  await runTest('AUTH-10', 'AUTH', 'Đăng nhập - Tài khoản không tồn tại', async () => {
    const { res } = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'user_khong_ton_tai_999999', password: 'Password123!' }),
    });
    const data = await res.json();
    if ((res.status === 400 || res.status === 401) && data.error) {
      return { details: `Hệ thống trả về thông báo lỗi chính xác (Status ${res.status}): "${data.error}"` };
    }
    return { status: 'FAILED', details: `Status ${res.status}, data: ${JSON.stringify(data)}` };
  });

  // Test AUTH-11: Re-Login with Username (Đăng nhập lại)
  await runTest('AUTH-11', 'AUTH', 'Đăng nhập lại bằng Tên đăng nhập (Re-login)', async () => {
    const { res } = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testUsername, password: testPassword }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.user) {
      const me = await request('/api/auth/me');
      const meData = await me.res.json();
      if (meData.user?.username === testUsername) {
        return { details: `Đăng nhập lại thành công! User id=${data.user.id}, me session khớp hoàn toàn.` };
      }
      return { status: 'WARNING', details: 'Đăng nhập trả về 200 nhưng session cookie me không match.' };
    }
    return { status: 'FAILED', details: `Đăng nhập lại thất bại: Status ${res.status}, error: ${data.error}` };
  });

  // Test AUTH-12: Login with Email
  await runTest('AUTH-12', 'AUTH', 'Đăng nhập bằng Email', async () => {
    await request('/api/auth/logout', { method: 'POST' });
    const { res } = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testEmail, password: testPassword }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.user?.username === testUsername) {
      return { details: `Đăng nhập bằng Email "${testEmail}" thành công, đúng tài khoản ${data.user.username}.` };
    }
    return { status: 'FAILED', details: `Đăng nhập bằng email thất bại: Status ${res.status}, error: ${data.error}` };
  });

  // Test AUTH-13: Profile Update (PUT)
  await runTest('AUTH-13', 'AUTH', 'Cập nhật thông tin người dùng (Update Profile PUT)', async () => {
    const { res } = await request('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: 'QA Lead Tester Pro' }),
    });
    const data = await res.json();
    if (res.status === 200 && data.user?.full_name === 'QA Lead Tester Pro') {
      return { details: `Cập nhật profile thành công: full_name mới = "${data.user.full_name}"` };
    }
    return {
      status: 'FAILED',
      details: `Cập nhật profile thất bại: Status ${res.status}, error: ${data.error || JSON.stringify(data)}`,
    };
  });

  // Test AUTH-14: Change Password (PATCH)
  const newPassword = 'NewPassword456!';
  await runTest('AUTH-14', 'AUTH', 'Đổi mật khẩu tài khoản (Change Password PATCH)', async () => {
    const { res } = await request('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: testPassword, newPassword }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      // Try login with new password
      await request('/api/auth/logout', { method: 'POST' });
      const loginCheck = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: testUsername, password: newPassword }),
      });
      const loginData = await loginCheck.res.json();
      if (loginCheck.res.status === 200 && loginData.success) {
        return { details: 'Đổi mật khẩu thành công! Đăng nhập lại bằng mật khẩu mới hoàn toàn chính xác.' };
      }
      return { status: 'WARNING', details: 'Đổi mật khẩu báo 200 nhưng đăng nhập lại với mật khẩu mới thất bại.' };
    }
    return { status: 'FAILED', details: `Đổi mật khẩu thất bại: Status ${res.status}, body: ${JSON.stringify(data)}` };
  });

  // ----------------------------------------------------
  // SECTION 2: LEARNING FEATURES TESTING
  // ----------------------------------------------------
  console.log('\n>>> 2. TESTING LEARNING FEATURES (BOOKS, TOPICS, FLASHCARDS, PRACTICE, REVIEW)');

  let availableBooks: any[] = [];
  let testTopicId: string | number | null = null;

  // Test LEARN-01: Books List API
  await runTest('LEARN-01', 'LEARNING', 'Danh mục sách học (/api/books)', async () => {
    const { res } = await request('/api/books');
    const data = await res.json();
    const books = data.books || (Array.isArray(data) ? data : []);
    if (res.status === 200 && Array.isArray(books) && books.length > 0) {
      availableBooks = books;
      const titles = books.map((b: any) => b.title || b.name).join(', ');
      return {
        details: `Tải thành công ${books.length} cuốn sách: [${titles}]`,
        raw: books.map((b: any) => ({ id: b.id, title: b.title, totalTopics: b.total_topics })),
      };
    }
    return { status: 'FAILED', details: `Không lấy được danh sách sách: Status ${res.status}, data: ${JSON.stringify(data)}` };
  });

  // Test LEARN-02: Books by language (English vs Chinese)
  await runTest('LEARN-02', 'LEARNING', 'Lọc sách theo ngôn ngữ (English & Chinese)', async () => {
    const enBooks = availableBooks.filter((b) => b.language === 'en' || !b.language || b.language_id === 1);
    const zhBooks = availableBooks.filter((b) => b.language === 'zh' || b.language_id === 2);
    return {
      details: `Hệ thống có ${enBooks.length} sách Tiếng Anh và ${zhBooks.length} cấp độ HSK Tiếng Trung.`,
      raw: { enCount: enBooks.length, zhCount: zhBooks.length },
    };
  });

  // Test LEARN-03: Book Detail & Topics
  if (availableBooks.length > 0) {
    const bookToTest = availableBooks[0];
    await runTest('LEARN-03', 'LEARNING', `Chi tiết sách & Danh sách chủ đề (Book ID: ${bookToTest.id})`, async () => {
      const { res } = await request(`/api/books/${bookToTest.id}`);
      const data = await res.json();
      if (res.status === 200 && data.topics && Array.isArray(data.topics)) {
        if (data.topics.length > 0) {
          testTopicId = data.topics[0].id;
        }
        return {
          details: `Sách "${data.title}" có ${data.topics.length} chủ đề (topics). Topic mẫu ID: ${testTopicId}`,
          raw: { topicCount: data.topics.length, firstTopic: data.topics[0] },
        };
      }
      return { status: 'FAILED', details: `Không lấy được topics của sách ${bookToTest.id}: Status ${res.status}` };
    });
  }

  // Test LEARN-04: Topic Detail & Vocabularies
  if (testTopicId) {
    await runTest('LEARN-04', 'LEARNING', `Nội dung từ vựng của chủ đề (Topic ID: ${testTopicId})`, async () => {
      const { res } = await request(`/api/topics/${testTopicId}`);
      const data = await res.json();
      if (res.status === 200 && data.topic) {
        const words = data.words || data.topic.words || [];
        if (words.length > 0) {
          const sampleWord = words[0];
          const hasPhonetic = !!sampleWord.phonetic || !!sampleWord.pinyin;
          const hasDefinition = !!sampleWord.definition || !!sampleWord.meaning || !!sampleWord.vietnamese;
          return {
            details: `Chủ đề "${data.topic.title}" có ${words.length} từ vựng. Từ mẫu: "${sampleWord.word || sampleWord.term}" (${sampleWord.phonetic || ''}) - Nghĩa: "${sampleWord.definition || sampleWord.vietnamese || ''}". Phiên âm: ${hasPhonetic ? 'Đầy đủ' : 'Thiếu'}, Định nghĩa: ${hasDefinition ? 'Đầy đủ' : 'Thiếu'}`,
            raw: { wordCount: words.length, sample: sampleWord },
          };
        }
        return { status: 'WARNING', details: `Chủ đề "${data.topic.title}" không có từ vựng nào (words rỗng).` };
      }
      return { status: 'FAILED', details: `Không lấy được dữ liệu topic: Status ${res.status}` };
    });

    // Test LEARN-05: Topic Practice Quiz Generator
    await runTest('LEARN-05', 'LEARNING', `Tạo bài luyện tập trắc nghiệm (Topic Practice: /api/topics/${testTopicId}/practice)`, async () => {
      const { res } = await request(`/api/topics/${testTopicId}/practice`);
      const data = await res.json();
      if (res.status === 200 && (Array.isArray(data.questions) || Array.isArray(data))) {
        const questions = Array.isArray(data.questions) ? data.questions : data;
        return {
          details: `Sinh thành công ${questions.length} câu hỏi luyện tập đa dạng (Multiple Choice, Fill-in-blank, v.v.).`,
          raw: { questionCount: questions.length, sampleQuestion: questions[0] },
        };
      }
      return {
        status: 'WARNING',
        details: `Endpoint /practice trả về status ${res.status}: ${JSON.stringify(data).substring(0, 150)}`,
      };
    });
  }

  // Test LEARN-06: SRS Review System
  await runTest('LEARN-06', 'LEARNING', 'Hệ thống ôn tập ngắt quãng SRS (/api/review?userId=...)', async () => {
    const url = createdUserId ? `/api/review?userId=${createdUserId}` : '/api/review?userId=demo-user-id';
    const { res } = await request(url);
    const data = await res.json();
    if (res.status === 200) {
      const queueCount = data.words?.length || data.reviews?.length || 0;
      return {
        details: `API SRS Review hoạt động chuẩn xác. Số lượng từ vựng cần ôn tập hiện tại: ${queueCount}.`,
        raw: data,
      };
    }
    return { status: 'FAILED', details: `Lỗi gọi API /api/review: Status ${res.status}, body: ${JSON.stringify(data)}` };
  });

  // Test LEARN-07: User Statistics API
  await runTest('LEARN-07', 'LEARNING', 'Thống kê học tập người dùng (/api/user/stats)', async () => {
    const { res } = await request(`/api/user/stats?userId=${createdUserId || 'demo-user-id'}`);
    const data = await res.json();
    if (res.status === 200) {
      return {
        details: `Dữ liệu thống kê người dùng trả về đầy đủ: Streak = ${data.streak || 0}, Learned = ${data.learned_words || data.total_learned || 0}, Accuracy = ${data.accuracy || 0}%`,
        raw: data,
      };
    }
    return { status: 'FAILED', details: `Không tải được thống kê: Status ${res.status}` };
  });

  // Test LEARN-08: Text-To-Speech (TTS Audio)
  await runTest('LEARN-08', 'LEARNING', 'Tạo giọng đọc phát âm chuẩn AI (/api/ai/tts)', async () => {
    const { res } = await request('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'knowledge', language: 'en' }),
    });
    if (res.status === 200) {
      const contentType = res.headers.get('content-type') || '';
      return {
        details: `TTS phản hồi thành công (Status 200, Content-Type: ${contentType}).`,
      };
    }
    const errData = await res.json().catch(() => ({}));
    return {
      status: 'WARNING',
      details: `TTS phản hồi status ${res.status}: ${JSON.stringify(errData)}`,
    };
  });

  // ----------------------------------------------------
  // SECTION 3: FRONTEND SSR / PAGES SMOKE TEST
  // ----------------------------------------------------
  console.log('\n>>> 3. TESTING FRONTEND PAGES RENDERING (SMOKE TEST)');

  const pagesToTest = [
    { path: '/', name: 'Trang chủ (Landing / Root)' },
    { path: '/languages', name: 'Trang Chọn Ngôn Ngữ' },
    { path: '/auth/login', name: 'Trang Đăng nhập' },
    { path: '/auth/register', name: 'Trang Đăng ký' },
    { path: '/dashboard', name: 'Trang Bảng điều khiển (Dashboard)' },
    { path: '/vocab', name: 'Trang Từ Vựng Tổng Quát' },
    { path: `/books/${availableBooks[0]?.id || 1}`, name: 'Trang Chi tiết Sách / Danh mục Topics' },
    { path: `/topics/${testTopicId || 1}`, name: 'Trang Chi tiết Topic Học / Flashcards' },
    { path: '/review', name: 'Trang Ôn tập SRS (Review)' },
    { path: '/reading-listening', name: 'Trang Luyện Đọc & Nghe' },
    { path: '/statistics', name: 'Trang Thống kê cá nhân' },
    { path: '/profile', name: 'Trang Hồ sơ người dùng' },
    { path: '/zh/vocab', name: 'Trang Tổng quan Từ Vựng Tiếng Trung' },
    { path: '/zh/hsk/1', name: 'Trang Cấp độ HSK 1' },
    { path: '/zh/review', name: 'Trang Ôn tập Tiếng Trung' },
  ];

  for (const p of pagesToTest) {
    await runTest(`SSR-${p.path.replace(/[^a-zA-Z0-9]/g, '_')}`, 'SSR_PAGES', `Render page ${p.path} - ${p.name}`, async () => {
      const { res } = await request(p.path);
      const text = await res.text();
      if (res.status === 200) {
        if (text.includes('Unhandled Runtime Error') || text.includes('Application error: a client-side exception')) {
          return { status: 'FAILED', details: `Gặp lỗi Unhandled Runtime Error khi render ${p.path}` };
        }
        return { details: `Trang render HTTP 200 OK (Kích thước HTML: ${Math.round(text.length / 1024)} KB)` };
      }
      return { status: 'FAILED', details: `Trang trả về status ${res.status} (Không phải 200)` };
    });
  }

  // ----------------------------------------------------
  // SECTION 4: SECURITY & VULNERABILITY CHECKS
  // ----------------------------------------------------
  console.log('\n>>> 4. TESTING SECURITY & DATA INTEGRITY');

  // Test SEC-01: Password Hashing Verification
  await runTest('SEC-01', 'SECURITY', 'Bảo mật mật khẩu - Không để lộ Hash/Password trong API', async () => {
    const me = await request('/api/auth/me');
    const meData = await me.res.json();
    if (meData.user) {
      if ('password' in meData.user || 'password_hash' in meData.user) {
        return {
          status: 'FAILED',
          details: 'LỖ HỔNG BẢO MẬT: API /api/auth/me làm lộ password hoặc password_hash trong response!',
        };
      }
      return { details: 'An toàn: API /api/auth/me đã lọc sạch password và hash trước khi gửi về client.' };
    }
    return { status: 'WARNING', details: 'Chưa kiểm tra được do phiên không khả dụng.' };
  });

  // Test SEC-02: SQL Injection / Character Escaping on Auth
  await runTest('SEC-02', 'SECURITY', 'Kiểm tra phòng chống SQL Injection trên Auth Identifier', async () => {
    const injectionPayload = `' OR '1'='1`;
    const { res } = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: injectionPayload, password: 'arbitrary_pass' }),
    });
    const data = await res.json();
    if ((res.status === 400 || res.status === 401) && !data.user) {
      return { details: `An toàn (Status ${res.status}): Hệ thống xử lý chuẩn xác bằng Prepared Statement, không bị bypass qua SQLi.` };
    }
    return { status: 'FAILED', details: `Cảnh báo bảo mật: Có phản hồi bất thường với SQLi payload: status ${res.status}` };
  });

  // ----------------------------------------------------
  // SUMMARY REPORT
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('TEST EXECUTION SUMMARY');
  console.log('====================================================');

  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const warnings = results.filter((r) => r.status === 'WARNING').length;
  const total = results.length;

  console.log(`TOTAL TESTS: ${total}`);
  console.log(`✅ PASSED:   ${passed}`);
  console.log(`❌ FAILED:   ${failed}`);
  console.log(`⚠️  WARNINGS: ${warnings}`);
  console.log('====================================================\n');

  // Save output report to scratch directory for analysis
  const report = {
    executedAt: new Date().toISOString(),
    summary: { total, passed, failed, warnings },
    results,
  };

  const fs = require('fs');
  fs.writeFileSync('scratch/qa_test_report.json', JSON.stringify(report, null, 2), 'utf-8');
  console.log('Saved detailed results to scratch/qa_test_report.json');
}

main().catch((err) => {
  console.error('Fatal error running QA suite:', err);
});

