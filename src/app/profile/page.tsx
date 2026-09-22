'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { useUserStats } from '@/lib/hooks/useLearningData';
import {
  User,
  Mail,
  Lock,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Flame,
  Award,
  BookOpen,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=tilua',
  'https://api.dicebear.com/7.x/bottts/svg?seed=sammy',
  'https://api.dicebear.com/7.x/bottts/svg?seed=alex',
  'https://api.dicebear.com/7.x/bottts/svg?seed=milo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=sparky',
  'https://api.dicebear.com/7.x/bottts/svg?seed=charlie',
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUser, loading: authLoading } = useAuth();
  const { stats } = useUserStats();

  // Form states
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_url || AVATAR_PRESETS[0]);
  const [customAvatar, setCustomAvatar] = useState('');

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Feedback states
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Sync user state when user changes
  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setSelectedAvatar(user.avatar_url || AVATAR_PRESETS[0]);
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-[#FF202F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }



  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    const avatarToSave = customAvatar.trim() || selectedAvatar;

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          full_name: fullName,
          email: email || null,
          avatar_url: avatarToSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileMsg({ type: 'error', text: data.error || 'Cập nhật hồ sơ thất bại' });
      } else {
        updateUser({
          full_name: fullName,
          email: email || null,
          avatar_url: avatarToSave,
        });
        setProfileMsg({ type: 'success', text: 'Đã lưu thay đổi hồ sơ thành công!' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Lỗi kết nối máy chủ' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    setSavingPwd(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          oldPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPwdMsg({ type: 'error', text: data.error || 'Đổi mật khẩu thất bại' });
      } else {
        setPwdMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPwdMsg({ type: 'error', text: 'Lỗi kết nối máy chủ' });
    } finally {
      setSavingPwd(false);
    }
  };

  const handleExportBackup = () => {
    window.location.href = `/api/user/backup?userId=${user.id}`;
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        const res = await fetch('/api/user/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, backupData: json }),
        });

        const data = await res.json();
        if (res.ok) {
          setBackupMsg({ type: 'success', text: data.message || 'Khôi phục dữ liệu thành công!' });
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setBackupMsg({ type: 'error', text: data.error || 'Khôi phục dữ liệu thất bại' });
        }
      } catch {
        setBackupMsg({ type: 'error', text: 'Tệp dữ liệu không hợp lệ hoặc bị lỗi cú pháp' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col text-neutral-100">
      <AppHeader streakDays={stats?.current_streak || 1} />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-8 space-y-8">
          {/* Header Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                Hồ Sơ Cá Nhân
                <Sparkles size={20} className="text-[#FF202F]" />
              </h1>
              <p className="text-xs text-neutral-400">
                Quản lý tài khoản, thay đổi diện mạo và bảo mật dữ liệu học tập của bạn
              </p>
            </div>
          </div>

          {/* Quick Learning Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#121212] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                <Award size={14} className="text-yellow-500" /> Từ đã thuộc
              </span>
              <span className="text-2xl font-black text-white mt-1">
                {stats?.total_words_mastered || 0}
              </span>
            </div>
            <div className="bg-[#121212] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                <BookOpen size={14} className="text-[#FF202F]" /> Từ đang học
              </span>
              <span className="text-2xl font-black text-white mt-1">
                {stats?.total_words_learned || 0}
              </span>
            </div>
            <div className="bg-[#121212] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-500" /> Bài hoàn thành
              </span>
              <span className="text-2xl font-black text-white mt-1">
                {stats?.total_topics_completed || 0}
              </span>
            </div>
            <div className="bg-[#121212] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                <Flame size={14} className="text-[#FF202F]" /> Chuỗi ngày
              </span>
              <span className="text-2xl font-black text-white mt-1">
                {stats?.current_streak || 1} <span className="text-xs font-normal text-neutral-400">ngày</span>
              </span>
            </div>
          </div>

          {/* Profile Details & Avatar Form */}
          <div className="bg-[#121212] border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User size={18} className="text-[#FF202F]" />
              Thông tin cá nhân & Ảnh đại diện
            </h2>

            {profileMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-red-950/60 border border-red-800 text-red-300'
                }`}
              >
                {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Avatar Picker */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Chọn ảnh đại diện phong cách LearnVocab
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(preset);
                        setCustomAvatar('');
                      }}
                      className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                        selectedAvatar === preset && !customAvatar
                          ? 'border-[#FF202F] scale-110 shadow-lg shadow-[#FF202F]/30 ring-2 ring-[#FF202F]/40'
                          : 'border-neutral-700 hover:border-neutral-500 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image src={preset} alt="avatar" fill className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <input
                    type="url"
                    placeholder="Hoặc dán URL ảnh đại diện cá nhân của bạn..."
                    value={customAvatar}
                    onChange={(e) => setCustomAvatar(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#FF202F]"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Tên hiển thị / Họ tên
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF202F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1">
                    <Mail size={12} className="text-neutral-400" /> Email liên hệ
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF202F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Tên đăng nhập (Username)
                </label>
                <input
                  type="text"
                  disabled
                  value={`@${user.username}`}
                  className="w-full bg-neutral-900/60 border border-neutral-800/80 rounded-xl px-3.5 py-2 text-xs text-neutral-400 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-[#FF202F] hover:bg-[#FF202F]/90 text-white font-bold text-xs shadow-lg shadow-[#FF202F]/25 transition-all disabled:opacity-50"
                >
                  {savingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-[#121212] border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock size={18} className="text-[#FF202F]" />
              Bảo mật & Đổi mật khẩu
            </h2>

            {pwdMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  pwdMsg.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-red-950/60 border border-red-800 text-red-300'
                }`}
              >
                {pwdMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{pwdMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF202F]"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF202F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF202F]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingPwd}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all disabled:opacity-50"
                >
                  {savingPwd ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>

          {/* Backup & Restore Learning Data */}
          <div className="bg-[#121212] border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Download size={18} className="text-[#FF202F]" />
              Sao lưu & Khôi phục dữ liệu học tập
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Bạn có thể tải toàn bộ tiến độ học từ vựng tiếng Anh và tiếng Trung HSK về máy tính để sao lưu cá nhân,
              hoặc nhập lại file khi chuyển sang thiết bị khác mà không bao giờ lo mất dữ liệu.
            </p>

            {backupMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  backupMsg.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-red-950/60 border border-red-800 text-red-300'
                }`}
              >
                {backupMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{backupMsg.text}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-4 py-2.5 rounded-xl bg-[#1c1415] border border-[#FF202F]/30 text-[#FF202F] hover:bg-[#FF202F]/10 text-xs font-bold flex items-center gap-2 transition-all"
              >
                <Download size={15} />
                <span>Xuất dữ liệu học tập (JSON)</span>
              </button>

              <label className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                <Upload size={15} />
                <span>Khôi phục từ file JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
