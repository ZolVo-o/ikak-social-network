import { useState } from 'react';
import { Edit3, Check, X, Calendar, Heart, Camera, ChevronLeft, ChevronRight, FileText, Users } from 'lucide-react';
import type { Post, User } from '../types';
import { cn } from '../utils/cn';
import { Avatar } from './Avatar';

interface ProfileProps {
  user: User;
  posts: Post[];
  onUpdateProfile: (updates: Partial<User>) => void;
  onToggleLike: (postId: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'сейчас';
  if (mins < 60) return `${mins}м`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч`;
  const days = Math.floor(hours / 24);
  return `${days}д`;
}

const AVATAR_STYLES = [
  { id: 'adventurer', label: 'Персонажи' },
  { id: 'avataaars', label: 'Люди' },
  { id: 'bottts', label: 'Роботы' },
  { id: 'pixel-art', label: 'Пиксели' },
  { id: 'thumbs', label: 'Смайлы' },
  { id: 'fun-emoji', label: 'Эмодзи' },
];

const SEEDS = [
  'Felix', 'Aneka', 'Milo', 'Bubba', 'Jasper',
  'Luna', 'Oscar', 'Lily', 'Max', 'Coco',
  'Bella', 'Rocky', 'Daisy', 'Leo', 'Nala',
  'Shadow', 'Ruby', 'Bear', 'Willow', 'Zeus',
];

export function Profile({ user, posts, onUpdateProfile, onToggleLike }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatarUrl);
  const [customUrl, setCustomUrl] = useState('');
  const [customUrlPreview, setCustomUrlPreview] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: user.displayName,
    username: user.username,
    bio: user.bio,
  });

  const userPosts = posts.filter(p => p.userId === user.id);
  const totalLikes = userPosts.reduce((sum, p) => sum + p.likes, 0);

  const handleOpenAvatarPicker = () => {
    setSelectedAvatar(user.avatarUrl);
    setCustomUrl('');
    setCustomUrlPreview(false);
    setShowAvatarPicker(true);
  };

  const handleSave = () => { onUpdateProfile(editForm); setIsEditing(false); };
  const handleCancel = () => {
    setEditForm({ displayName: user.displayName, username: user.username, bio: user.bio });
    setIsEditing(false);
  };
  const handleSaveAvatar = () => { onUpdateProfile({ avatarUrl: selectedAvatar }); setShowAvatarPicker(false); };

  const currentStyle = AVATAR_STYLES[selectedStyle];
  const avatarUrls = SEEDS.map(s => `https://api.dicebear.com/9.x/${currentStyle.id}/svg?seed=${s}`);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 pt-6 pb-4 bg-[#050507]/80 backdrop-blur-2xl">
        <h2 className="text-2xl font-black text-white tracking-tight">Профиль</h2>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.05] mb-6 card-hover">
        {/* Banner */}
        <div className="h-36 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 animate-gradient" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noise)%22%2F%3E%3C%2Fsvg%3E')] opacity-[0.08] mix-blend-overlay" />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#08080a]/60 to-transparent" />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar + Actions */}
          <div className="-mt-12 mb-5 flex justify-between items-end">
            <div className="relative group cursor-pointer" onClick={handleOpenAvatarPicker}>
              <div className="ring-4 ring-[#08080a] rounded-full">
                <Avatar src={user.avatarUrl} alt={user.displayName} size="xl" />
              </div>
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-all duration-300 ring-4 ring-[#08080a]">
                <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-all duration-300 drop-shadow-lg" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-2 border-[#08080a] shadow-lg">
                <Camera size={10} className="text-white" />
              </div>
            </div>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-zinc-300 border border-white/[0.08] rounded-xl hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300"
              >
                <Edit3 size={13} />
                <span>Редактировать</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleCancel} className="p-2.5 text-zinc-400 border border-white/[0.08] rounded-xl hover:bg-white/[0.04] transition-all">
                  <X size={15} />
                </button>
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all">
                  <Check size={13} />
                  <span>Сохранить</span>
                </button>
              </div>
            )}
          </div>

          {/* Info */}
          {isEditing ? (
            <div className="space-y-4 animate-fade-in">
              {[
                { label: 'Имя', key: 'displayName' as const, prefix: '' },
                { label: 'Юзернейм', key: 'username' as const, prefix: '@' },
              ].map(({ label, key, prefix }) => (
                <div key={key}>
                  <label className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5 block">{label}</label>
                  <div className="flex items-center">
                    {prefix && <span className="text-zinc-500 text-sm mr-1">{prefix}</span>}
                    <input
                      value={editForm[key]}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                </div>
              ))}
              <div>
                <label className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5 block">О себе</label>
                <textarea
                  value={editForm.bio}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-bold text-white">{user.displayName}</h3>
              <p className="text-zinc-500 text-sm">@{user.username}</p>
              {user.bio && <p className="mt-3 text-zinc-300 text-[14px] leading-relaxed">{user.bio}</p>}
              <div className="flex items-center gap-2 mt-3 text-zinc-600 text-xs">
                <Calendar size={13} />
                <span>С {new Date(user.joinedDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { icon: FileText, value: userPosts.length, label: 'постов', color: 'text-indigo-400 bg-indigo-500/10' },
              { icon: Heart, value: totalLikes, label: 'лайков', color: 'text-rose-400 bg-rose-500/10' },
              { icon: Users, value: 0, label: 'подписчиков', color: 'text-emerald-400 bg-emerald-500/10' },
            ].map(({ icon: Icon, value, label, color }) => (
              <div key={label} className="text-center py-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className={cn('w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center', color)}>
                  <Icon size={14} />
                </div>
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-[11px] text-zinc-500 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowAvatarPicker(false)} />

          <div className="relative bg-[#12121a] border border-white/[0.06] rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-slide-up shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
              <h3 className="text-lg font-bold text-white">Выбери аватарку</h3>
              <button onClick={() => setShowAvatarPicker(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Preview */}
            <div className="flex justify-center py-6 border-b border-white/[0.04] bg-white/[0.01]">
              <div className="relative">
                <img src={selectedAvatar} alt="" className="w-24 h-24 rounded-full bg-zinc-800 object-cover ring-4 ring-indigo-500/30"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/avataaars/svg?seed=fallback`; }}
                />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-2 border-[#12121a]">
                  <Check size={12} className="text-white" />
                </div>
              </div>
            </div>

            {/* Style tabs */}
            <div className="px-5 pt-4 flex items-center gap-2">
              <button onClick={() => setSelectedStyle(s => Math.max(0, s - 1))} disabled={selectedStyle === 0}
                className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-20 transition-all shrink-0">
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-1.5 overflow-x-auto flex-1">
                {AVATAR_STYLES.map((style, i) => (
                  <button key={style.id} onClick={() => setSelectedStyle(i)}
                    className={cn(
                      'px-3 py-1.5 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all duration-300',
                      selectedStyle === i
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]'
                    )}>
                    {style.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setSelectedStyle(s => Math.min(AVATAR_STYLES.length - 1, s + 1))}
                disabled={selectedStyle === AVATAR_STYLES.length - 1}
                className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-20 transition-all shrink-0">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-5 gap-2.5">
                {avatarUrls.map((url) => (
                  <button key={url} onClick={() => { setSelectedAvatar(url); setCustomUrlPreview(false); }}
                    className={cn(
                      'relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 group/av',
                      selectedAvatar === url
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/20'
                        : 'border-white/[0.06] hover:border-white/[0.15]'
                    )}>
                    <img src={url} alt="" className="w-full h-full object-cover bg-zinc-800/50 p-1.5" />
                    {selectedAvatar === url && (
                      <div className="absolute inset-0 bg-indigo-500/15 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <Check size={12} className="text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom URL */}
              <div className="mt-5 pt-4 border-t border-white/[0.04]">
                <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Или вставь ссылку</p>
                <div className="flex gap-2">
                  <input type="url" value={customUrl} onChange={e => setCustomUrl(e.target.value)}
                    placeholder="https://..." className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-zinc-600" />
                  <button onClick={() => { if (customUrl.trim()) { setSelectedAvatar(customUrl.trim()); setCustomUrlPreview(true); } }}
                    disabled={!customUrl.trim()} className="px-4 py-2.5 text-sm font-semibold bg-white/[0.05] text-zinc-300 rounded-xl hover:bg-white/[0.08] disabled:opacity-30 transition-all">
                    Ок
                  </button>
                </div>
                {customUrlPreview && (
                  <div className="mt-3 flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] animate-fade-in">
                    <img src={selectedAvatar} alt="" className="w-10 h-10 rounded-full bg-zinc-800 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/avataaars/svg?seed=error`; }} />
                    <span className="text-xs text-zinc-400">Превью</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/[0.04]">
              <button onClick={() => setShowAvatarPicker(false)}
                className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-zinc-400 border border-white/[0.08] rounded-xl hover:bg-white/[0.04] transition-all">
                Отмена
              </button>
              <button onClick={handleSaveAvatar} disabled={selectedAvatar === user.avatarUrl}
                className="flex-1 px-4 py-2.5 text-[13px] font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-30 transition-all">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Posts */}
      <div className="space-y-3 pb-24 md:pb-8">
        <div className="flex items-center gap-2 px-1 mb-2">
          <FileText size={14} className="text-zinc-600" />
          <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Мои посты</h3>
        </div>
        {userPosts.map(post => (
          <article key={post.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-5 card-hover">
            <p className="text-zinc-200 text-[15px] leading-[1.7]">{post.content}</p>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
              <span className="text-[11px] text-zinc-600">{timeAgo(post.createdAt)}</span>
              <button onClick={() => onToggleLike(post.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-300',
                  post.liked ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5')}>
                <Heart size={14} className={cn(post.liked && 'fill-current')} />
                <span className="font-medium">{post.likes}</span>
              </button>
            </div>
          </article>
        ))}
        {userPosts.length === 0 && (
          <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
            <p className="text-zinc-400 font-semibold">Пока нет постов</p>
            <p className="text-zinc-600 text-sm mt-1">Напишите что-нибудь в ленте</p>
          </div>
        )}
      </div>
    </div>
  );
}
