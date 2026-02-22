import { Home, User as UserIcon, Settings, LogOut } from 'lucide-react';
import type { Page, User } from '../types';
import { cn } from '../utils/cn';
import { Avatar } from './Avatar';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: User;
  onLogout: () => void;
}

const navItems: { page: Page; label: string; icon: typeof Home }[] = [
  { page: 'feed', label: 'Лента', icon: Home },
  { page: 'profile', label: 'Профиль', icon: UserIcon },
  { page: 'settings', label: 'Настройки', icon: Settings },
];

export function Navigation({ currentPage, onNavigate, user, onLogout }: NavigationProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-72 flex-col z-30 border-r border-white/[0.04] bg-[#080809]/80 backdrop-blur-2xl">
        {/* Logo */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-sm tracking-tight">ик</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">и как</h1>
              <p className="text-[10px] text-zinc-500 font-medium -mt-0.5">social network</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 px-4 pt-6 space-y-1">
          {navItems.map(({ page, label, icon: Icon }) => {
            const active = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={cn(
                  'w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left transition-all duration-300 group relative',
                  active
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-200'
                )}
              >
                {active && (
                  <div className="absolute inset-0 rounded-2xl bg-white/[0.06] border border-white/[0.08]" />
                )}
                <div className={cn(
                  'relative z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300',
                  active
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25'
                    : 'bg-zinc-800/50 group-hover:bg-zinc-800'
                )}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? 'text-white' : ''} />
                </div>
                <span className="relative z-10 text-sm font-semibold">{label}</span>
              </button>
            );
          })}
        </div>

        {/* User card */}
        <div className="p-4 mx-3 mb-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
          <div className="flex items-center gap-3">
            <Avatar src={user.avatarUrl} alt={user.displayName} size="md" online ring />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">{user.displayName}</p>
              <p className="text-[11px] text-zinc-500 truncate">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 text-xs font-medium"
          >
            <LogOut size={14} />
            <span>Выйти</span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.04] bg-[#080809]/90 backdrop-blur-2xl">
        <div className="flex justify-around items-center h-16 px-6 max-w-md mx-auto">
          {navItems.map(({ page, label, icon: Icon }) => {
            const active = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={cn(
                  'flex flex-col items-center gap-1 px-5 py-1.5 rounded-2xl transition-all duration-300 relative',
                  active ? 'text-white' : 'text-zinc-600'
                )}
              >
                {active && (
                  <div className="absolute -top-1 w-8 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
