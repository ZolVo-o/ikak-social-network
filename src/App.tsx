import { Navigation } from './components/Navigation';
import { Feed } from './components/Feed';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import Auth from './components/Auth';
import { AnimatedBackground } from './components/AnimatedBackground';
import { useAppState } from './store';

export function App() {
  const {
    currentPage, setCurrentPage,
    currentUser, isAuthenticated, authLoading,
    posts, settings,
    login, register, activateSession, logout,
    addPost, toggleLike, addComment, deletePost,
    updateProfile, updateSettings, refreshPosts,
  } = useAppState();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center noise">
        <AnimatedBackground variant="auth" />
        <div className="text-center animate-fade-in relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto">
              <span className="text-white font-black text-2xl">ик</span>
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto animate-ping opacity-20" />
          </div>
          <p className="text-zinc-500 text-sm font-medium mt-6 tracking-wide">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Auth onLogin={login} onRegister={register} onActivateSession={activateSession} />;
  }

  return (
    <div className="min-h-screen bg-[#050507] noise">
      <AnimatedBackground variant="app" />

      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        user={currentUser}
        onLogout={logout}
      />

      <main className="relative z-10 md:ml-72 px-4 md:px-8">
        {currentPage === 'feed' && (
          <Feed
            posts={posts}
            currentUser={currentUser}
            onAddPost={addPost}
            onToggleLike={toggleLike}
            onAddComment={addComment}
            onDeletePost={deletePost}
            onRefresh={refreshPosts}
          />
        )}
        {currentPage === 'profile' && (
          <Profile
            user={currentUser}
            posts={posts}
            onUpdateProfile={updateProfile}
            onToggleLike={toggleLike}
          />
        )}
        {currentPage === 'settings' && (
          <Settings
            settings={settings}
            onUpdateSettings={updateSettings}
            user={currentUser}
            onLogout={logout}
          />
        )}
      </main>
    </div>
  );
}
