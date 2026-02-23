import { useState, useCallback, useEffect, useRef } from 'react';
import type { User, Post, Comment, AppSettings, Page } from './types';
import { supabase } from './lib/supabase';

// =========================================
// SECURITY HELPERS
// =========================================

function sanitizeInput(input: string, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, maxLength)
    .trim();
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-z][a-z0-9_]{2,19}$/;
  return usernameRegex.test(username);
}

function sanitizeUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('https://') || url.startsWith('data:')) return url;
  return '';
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkClientRateLimit(action: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(action);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(action, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}

const safeStorage = {
  set: (key: string, value: unknown): void => {
    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(value)));
      localStorage.setItem(key, encoded);
    } catch { /* ignore */ }
  },
  get: <T>(key: string): T | null => {
    try {
      const encoded = localStorage.getItem(key);
      if (!encoded) return null;
      return JSON.parse(decodeURIComponent(atob(encoded))) as T;
    } catch { return null; }
  },
  remove: (key: string): void => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
};

export function useAppState() {
  const [currentPage, setCurrentPage] = useState<Page>('feed');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true,
    language: 'ru',
    privateProfile: false,
    showOnline: true,
  });

  const sessionRestoredRef = useRef(false);
  const isRegisteringRef = useRef(false);
  const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // =========================================
  // FETCH POSTS - надёжная версия
  // =========================================
  const fetchPosts = useCallback(async (userId?: string) => {
    try {
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, user_id, content, created_at')
        .order('created_at', { ascending: false });

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const { data: allLikes } = await supabase.from('likes').select('post_id, user_id');
      const likeCounts = new Map<string, number>();
      const userLikedPosts = new Set<string>();
      allLikes?.forEach(l => {
        likeCounts.set(l.post_id, (likeCounts.get(l.post_id) || 0) + 1);
        if (userId && l.user_id === userId) userLikedPosts.add(l.post_id);
      });

      const postIds = postsData.map(p => p.id);
      const { data: commentsData } = await supabase
        .from('comments')
        .select('id, post_id, user_id, content, created_at')
        .in('post_id', postIds);

      const commentUserIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      let commentProfiles: any[] = [];
      if (commentUserIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', commentUserIds);
        commentProfiles = data || [];
      }
      const commentProfileMap = new Map(commentProfiles.map(p => [p.id, p]));

      const commentsMap = new Map<string, Comment[]>();
      commentsData?.forEach(c => {
        const cp = commentProfileMap.get(c.user_id);
        const comment: Comment = {
          id: c.id,
          userId: c.user_id,
          username: cp?.username || 'user',
          displayName: cp?.display_name || 'Пользователь',
          avatarUrl: cp?.avatar_url || '',
          content: c.content,
          createdAt: c.created_at,
        };
        commentsMap.set(c.post_id, [...(commentsMap.get(c.post_id) || []), comment]);
      });

      const builtPosts: Post[] = postsData.map(p => {
        const profile = profileMap.get(p.user_id);
        return {
          id: p.id,
          userId: p.user_id,
          username: profile?.username || 'user',
          displayName: profile?.display_name || 'Пользователь',
          avatarUrl: profile?.avatar_url || '',
          content: p.content,
          createdAt: p.created_at,
          likes: likeCounts.get(p.id) || 0,
          liked: userLikedPosts.has(p.id),
          comments: commentsMap.get(p.id) || [],
        };
      });

      setPosts(builtPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  }, []);

  // =========================================
  // RESOLVE USER
  // =========================================
  const resolveUser = useCallback(async (): Promise<User | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const authUser = session.user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        return {
          id: authUser.id,
          email: authUser.email || '',
          username: profile.username,
          displayName: profile.display_name,
          bio: profile.bio || '',
          avatarUrl: profile.avatar_url || '',
          joinedDate: profile.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        };
      }

      const meta = authUser.user_metadata || {};
      const username = meta.username || authUser.email?.split('@')[0] || 'user';
      const displayName = meta.display_name || username;
      const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${authUser.id}`;

      try {
        await supabase.from('profiles').insert({
          id: authUser.id,
          username,
          display_name: displayName,
          bio: '',
          avatar_url: avatarUrl,
        });
      } catch { /* ignore */ }

      return {
        id: authUser.id,
        email: authUser.email || '',
        username,
        displayName,
        bio: '',
        avatarUrl,
        joinedDate: new Date().toISOString().split('T')[0],
      };
    } catch {
      return null;
    }
  }, []);

  // =========================================
  // RESTORE SESSION - быстрая версия
  // =========================================
  useEffect(() => {
    if (sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;

    const restoreSession = async () => {
      // Таймаут 2 секунды
      authTimeoutRef.current = setTimeout(() => {
        setAuthLoading(false);
      }, 2000);

      if (isRegisteringRef.current) {
        setAuthLoading(false);
        return;
      }

      // Всего 2 попытки
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const user = await resolveUser();
          if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
            fetchPosts(user.id);
            clearTimeout(authTimeoutRef.current!);
            setAuthLoading(false);
            return;
          }
        } catch { /* ignore */ }
        
        if (attempt < 1) await new Promise(r => setTimeout(r, 500));
      }

      setIsAuthenticated(false);
      clearTimeout(authTimeoutRef.current!);
      setAuthLoading(false);
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setPosts([]);
        isRegisteringRef.current = false;
      } else if (event === 'SIGNED_IN' && session?.user) {
        isRegisteringRef.current = false;
        const user = await resolveUser();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setAuthLoading(false);
          fetchPosts(user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, []);

  // =========================================
  // LOGIN
  // =========================================
  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login')) return 'Неверный email или пароль';
      if (error.message.includes('Email not confirmed')) return 'Подтвердите email';
      return error.message;
    }

    if (data.user) {
      isRegisteringRef.current = false;
      const user = await resolveUser();
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        setAuthLoading(false);
        fetchPosts(user.id);
      }
    }

    return null;
  }, [fetchPosts, resolveUser]);

  // =========================================
  // REGISTER
  // =========================================
  const register = useCallback(async (data: {
    email: string;
    password: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }): Promise<string | null> => {
    if (!checkClientRateLimit('register', 5, 60000)) {
      return 'Слишком много попыток. Попробуйте позже.';
    }
    if (!isValidEmail(data.email)) return 'Введите корректный email';
    if (!isValidUsername(data.username)) return 'Юзернейм: 3-20 символов, латиница, цифры';
    if (data.password.length < 6) return 'Пароль от 6 символов';

    isRegisteringRef.current = true;

    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', data.username.toLowerCase())
        .single();
      if (existing) {
        isRegisteringRef.current = false;
        return 'Юзернейм занят';
      }
    } catch { /* ignore */ }

    const avatarUrl = sanitizeUrl(data.avatarUrl) || `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.username}`;
    const sanitizedUsername = sanitizeInput(data.username.toLowerCase(), 20);
    const sanitizedDisplayName = sanitizeInput(data.displayName, 50);

    safeStorage.set('ikak_pending_profile', {
      username: sanitizedUsername,
      displayName: sanitizedDisplayName,
      avatarUrl,
    });

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.toLowerCase(),
      password: data.password,
      options: {
        data: { username: sanitizedUsername, display_name: sanitizedDisplayName },
        emailRedirectTo: 'https://ikak-social-network-zolvo.netlify.app/',
      },
    });

    if (authError) {
      safeStorage.remove('ikak_pending_profile');
      isRegisteringRef.current = false;
      return authError.message;
    }

    if (!authData.user) {
      safeStorage.remove('ikak_pending_profile');
      isRegisteringRef.current = false;
      return 'Ошибка создания аккаунта';
    }

    if (authData.session) {
      try {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          username: sanitizedUsername,
          display_name: sanitizedDisplayName,
          bio: '',
          avatar_url: avatarUrl,
        });
        safeStorage.remove('ikak_pending_profile');
      } catch { /* ignore */ }
      return null;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email.toLowerCase(),
      password: data.password,
    });

    if (signInError) return 'EMAIL_CONFIRM_REQUIRED';

    try {
      await supabase.from('profiles').insert({
        id: authData.user.id,
        username: sanitizedUsername,
        display_name: sanitizedDisplayName,
        bio: '',
        avatar_url: avatarUrl,
      });
      safeStorage.remove('ikak_pending_profile');
    } catch { /* ignore */ }

    return null;
  }, []);

  // =========================================
  // LOGOUT
  // =========================================
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentPage('feed');
    setPosts([]);
    isRegisteringRef.current = false;
    sessionRestoredRef.current = false;
    safeStorage.remove('ikak_pending_profile');
  }, []);

  // =========================================
  // ADD POST
  // =========================================
  const addPost = useCallback(async (content: string) => {
    if (!currentUser) return;
    if (!checkClientRateLimit('post', 10, 60000)) return;

    const sanitizedContent = sanitizeInput(content, 5000);
    if (!sanitizedContent) return;

    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: currentUser.id, content: sanitizedContent })
      .select()
      .single();

    if (error || !data) return;

    const newPost: Post = {
      id: data.id,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      content: data.content,
      createdAt: data.created_at,
      likes: 0,
      liked: false,
      comments: [],
    };
    setPosts(prev => [newPost, ...prev]);
  }, [currentUser]);

  // =========================================
  // TOGGLE LIKE
  // =========================================
  const toggleLike = useCallback(async (postId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.liked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: false, likes: p.likes - 1 } : p));
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: true, likes: p.likes + 1 } : p));
    }
  }, [currentUser, posts]);

  // =========================================
  // ADD COMMENT
  // =========================================
  const addComment = useCallback(async (postId: string, content: string) => {
    if (!currentUser) return;
    if (!checkClientRateLimit(`comment_${postId}`, 20, 60000)) return;

    const sanitizedContent = sanitizeInput(content, 1000);
    if (!sanitizedContent) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: currentUser.id, content: sanitizedContent })
      .select()
      .single();

    if (error || !data) return;

    const newComment: Comment = {
      id: data.id,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      content: data.content,
      createdAt: data.created_at,
    };
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
    ));
  }, [currentUser]);

  // =========================================
  // DELETE POST
  // =========================================
  const deletePost = useCallback(async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  // =========================================
  // UPDATE PROFILE
  // =========================================
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!currentUser) return;

    const dbUpdates: Record<string, string> = {};
    if (updates.displayName !== undefined) {
      const sanitized = sanitizeInput(updates.displayName, 50);
      if (sanitized) dbUpdates.display_name = sanitized;
    }
    if (updates.username !== undefined) {
      if (isValidUsername(updates.username)) dbUpdates.username = updates.username.toLowerCase();
    }
    if (updates.bio !== undefined) {
      dbUpdates.bio = sanitizeInput(updates.bio, 500);
    }
    if (updates.avatarUrl !== undefined) {
      const sanitized = sanitizeUrl(updates.avatarUrl);
      if (sanitized) dbUpdates.avatar_url = sanitized;
    }

    if (Object.keys(dbUpdates).length === 0) return;

    await supabase.from('profiles').update(dbUpdates).eq('id', currentUser.id);

    setCurrentUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      setPosts(ps => ps.map(p =>
        p.userId === prev.id
          ? { ...p, username: updated.username, displayName: updated.displayName, avatarUrl: updated.avatarUrl }
          : p
      ));
      return updated;
    });
  }, [currentUser]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const refreshPosts = useCallback(() => {
    if (currentUser) fetchPosts(currentUser.id);
  }, [currentUser, fetchPosts]);

  return {
    currentPage, setCurrentPage,
    currentUser, isAuthenticated, authLoading,
    posts, settings,
    login, register, logout,
    addPost, toggleLike, addComment, deletePost,
    updateProfile, updateSettings, refreshPosts,
  };
}
