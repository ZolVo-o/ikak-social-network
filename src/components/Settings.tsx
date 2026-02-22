import { Bell, BellOff, Globe, Database, Lock, Eye, Info, LogOut, Mail, Zap, Shield, Palette } from 'lucide-react';
import type { AppSettings, User } from '../types';
import { cn } from '../utils/cn';
import { Avatar } from './Avatar';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  user: User;
  onLogout: () => void;
}

function Toggle({ enabled, onChange, color = 'indigo' }: { enabled: boolean; onChange: () => void; color?: string }) {
  const gradients: Record<string, string> = {
    indigo: 'from-indigo-500 to-purple-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600',
  };
  return (
    <button onClick={onChange}
      className={cn(
        'relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0',
        enabled ? `bg-gradient-to-r ${gradients[color]} shadow-lg shadow-${color}-500/20` : 'bg-zinc-800 border border-white/[0.06]'
      )}>
      <span className={cn(
        'absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300',
        enabled && 'translate-x-[22px]'
      )} />
    </button>
  );
}

function SettingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] mb-4 overflow-hidden card-hover">
      <div className="px-5 pt-5 pb-1">
        <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          {title}
        </h3>
      </div>
      <div className="px-5 pb-2">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, title, desc, iconColor, children }: {
  icon: typeof Bell; title: string; desc: string; iconColor: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex items-center gap-3.5">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconColor)}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-[13px] font-medium text-zinc-200">{title}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function Settings({ settings, onUpdateSettings, user, onLogout }: SettingsProps) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 pt-6 pb-4 bg-[#050507]/80 backdrop-blur-2xl">
        <h2 className="text-2xl font-black text-white tracking-tight">Настройки</h2>
      </div>

      {/* Account */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-5 mb-4 card-hover">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatarUrl} alt={user.displayName} size="lg" online ring />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-base">{user.displayName}</p>
            <p className="text-zinc-500 text-sm">@{user.username}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-zinc-600 text-[11px]">
              <Mail size={11} />
              <span>{user.email}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
            <Shield size={16} className="text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Supabase Status */}
      <div className="rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/10 p-5 mb-4 card-hover">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Database size={16} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-emerald-400">Supabase подключён</h3>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Данные синхронизируются с облаком</p>
          </div>
          <Zap size={16} className="text-emerald-500/50" />
        </div>
      </div>

      {/* Notifications & Privacy */}
      <SettingCard title="Уведомления и приватность">
        <SettingRow icon={settings.notifications ? Bell : BellOff} title="Push-уведомления" desc="Лайки, комментарии, подписки"
          iconColor="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Toggle enabled={settings.notifications} onChange={() => onUpdateSettings({ notifications: !settings.notifications })} color="indigo" />
        </SettingRow>
        <div className="border-t border-white/[0.03]" />
        <SettingRow icon={Lock} title="Приватный профиль" desc="Скрыть от незарегистрированных"
          iconColor="bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Toggle enabled={settings.privateProfile} onChange={() => onUpdateSettings({ privateProfile: !settings.privateProfile })} color="amber" />
        </SettingRow>
        <div className="border-t border-white/[0.03]" />
        <SettingRow icon={Eye} title="Статус онлайн" desc="Показывать, что вы в сети"
          iconColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Toggle enabled={settings.showOnline} onChange={() => onUpdateSettings({ showOnline: !settings.showOnline })} color="emerald" />
        </SettingRow>
      </SettingCard>

      {/* General */}
      <SettingCard title="Общие">
        <SettingRow icon={Globe} title="Язык" desc="Язык интерфейса"
          iconColor="bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <select value={settings.language} onChange={e => onUpdateSettings({ language: e.target.value as 'ru' | 'en' })}
            className="text-[13px] bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2 text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer">
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </SettingRow>
        <div className="border-t border-white/[0.03]" />
        <SettingRow icon={Palette} title="Тема" desc="Оформление приложения"
          iconColor="bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <span className="text-[12px] text-zinc-500 font-medium bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-lg">Тёмная</span>
        </SettingRow>
      </SettingCard>

      {/* About */}
      <SettingCard title="О приложении">
        <SettingRow icon={Info} title="Версия" desc="и как v1.0"
          iconColor="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
          <span className="text-[11px] text-zinc-600 font-mono bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.04]">1.0.0</span>
        </SettingRow>
        <div className="border-t border-white/[0.03]" />
        <SettingRow icon={Zap} title="Стек" desc="React · Vite · Tailwind · Supabase"
          iconColor="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          <span className="text-xs text-zinc-600">⚛️ ⚡ 🎨 💚</span>
        </SettingRow>
      </SettingCard>

      {/* Logout */}
      <button onClick={onLogout}
        className="w-full rounded-2xl bg-red-500/[0.04] border border-red-500/10 flex items-center justify-center gap-2.5 px-5 py-4 text-red-400 hover:bg-red-500/[0.08] hover:border-red-500/20 transition-all duration-300 mb-4 group">
        <LogOut size={16} className="group-hover:translate-x-[-2px] transition-transform" />
        <span className="text-[13px] font-semibold">Выйти из аккаунта</span>
      </button>

      {/* Footer */}
      <div className="text-center py-8 pb-24 md:pb-8">
        <p className="text-[11px] text-zinc-700">сделано с 💜 для своих</p>
      </div>
    </div>
  );
}
