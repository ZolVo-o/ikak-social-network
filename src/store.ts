import { useState, useCallback, useEffect, useRef } from 'react';
import type { User, Post, Comment, AppSettings, Page } from './types';
import { supabase } from './lib/supabase';

// =========================================
// SECURITY HELPERS - ZASHITA OT XSS I BEZOPASNOST
// =========================================

// SANITIZACIA VVODA
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

// VALIDACIA EMAIL
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// VALIDACIA USERNAME (tolko latinica, cifry, podcherkivanie)
function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-z][a-z0-9_]{2,19}$/;
  return usernameRegex.test(username);
}

// SANITIZACIA URL (tolko bezopasnye protokoly)
function sanitizeUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return '';
}

// Rate limiting na kliente (zashita ot spam)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkClientRateLimit(action: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = action;
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    console.warn(`Rate limit exceeded for: ${action}`);
    return false;
  }
  
  record.count++;
  return true;
}

// Bezopasnoe hranilishe (bazovaya zashita)
const safeStorage = {
  set: (key: string, value: unknown): void => {
    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(value)));
      localStorage.setItem(key, encoded);
    } catch {
      // Ignoriruem oshibki
    }
  },

  get: <T>(key: string): T | null => {
    try {
      const encoded = localStorage.getItem(key);
      if (!encoded) return null;
      return JSON.parse(decodeURIComponent(atob(encoded))) as T;
    } catch {
      return null;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignoriruem oshibki
    }
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

  // Refs to prevent double-runs and race conditions
  const sessionRestoredRef = useRef(false);
  const isRegisteringRef = useRef(false);
  const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // =========================================
  // FETCH POSTS
  // =========================================
  const fetchPosts = useCallback(async (userId?: string) => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Fetch posts error:', postsError);
        return;
      }
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      let userLikes: Set<string> = new Set();
      if (userId) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', userId);
        userLikes = new Set(likesData?.map(l => l.post_id) || []);
      }

      const { data: allLikes } = await supabase.from('likes').select('post_id');
      const likeCounts = new Map<string, number>();
      allLikes?.forEach(l => {
        likeCounts.set(l.post_id, (likeCounts.get(l.post_id) || 0) + 1);
      });

      const postIds = postsData.map(p => p.id);
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

      const commentUserIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      let commentProfileMap = new Map();
      if (commentUserIds.length > 0) {
        const { data: commentProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', commentUserIds);
        commentProfileMap = new Map(commentProfiles?.map(p => [p.id, p]) || []);
      }

      const commentsMap = new Map<string, Comment[]>();
      commentsData?.forEach(c => {
        const profile = commentProfileMap.get(c.user_id);
        const comment: Comment = {
          id: c.id,
          userId: c.user_id,
          username: profile?.username || 'user',
          displayName: profile?.display_name || 'Polzovatel',
          avatarUrl: profile?.avatar_url || '',
          content: c.content,
          createdAt: c.created_at,
        };
        const existing = commentsMap.get(c.post_id) || [];
        existing.push(comment);
        commentsMap.set(c.post_id, existing);
      });

      const builtPosts: Post[] = postsData.map(p => {
        const profile = profileMap.get(p.user_id);
        return {
          id: p.id,
          userId: p.user_id,
          username: profile?.username || 'user',
          displayName: profile?.display_name || 'Polzovatel',
          avatarUrl: profile?.avatar_url || '',
          content: p.content,
          createdAt: p.created_at,
          likes: likeCounts.get(p.id) || 0,
          liked: userLikes.has(p.id),
          comments: commentsMap.get(p.id) || [],
        };
      });

      setPosts(builtPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  }, []);

  // =========================================
  // Zagruzit yuzera iz sessii Supabase
  // =========================================
  const resolveUser = useCallback(async (): Promise<User | null> => {
    try {
      console.log('[resolveUser] Starting...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[resolveUser] Session:', session ? 'exists' : 'null');
      if (!session?.user) {
        console.log('[resolveUser] No session user, returning null');
        return null;
      }

      const authUser = session.user;
      console.log('[resolveUser] Auth user:', authUser.id);

      // 1) Profil iz BD
      try {
        console.log('[resolveUser] Fetching profile from DB...');
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        console.log('[resolveUser] Profile data:', profile, 'Error:', error);

        if (profile && !error) {
          console.log('[resolveUser] Profile found, returning user');
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
      } catch (e) {
        console.log('[resolveUser] Profile fetch error:', e);
      }

      // 2) Pending profil iz bezopasnogo hranilischa
      const pending = safeStorage.get<{ username: string; displayName: string; avatarUrl: string }>('ikak_pending_profile');
      if (pending) {
        console.log('[resolveUser] Found pending profile');
        try {
          await supabase.from('profiles').insert({
            id: authUser.id,
            username: pending.username,
            display_name: pending.displayName,
            bio: '',
            avatar_url: pending.avatarUrl,
          });
          safeStorage.remove('ikak_pending_profile');

          return {
            id: authUser.id,
            email: authUser.email || '',
            username: pending.username,
            displayName: pending.displayName,
            bio: '',
            avatarUrl: pending.avatarUrl || '',
            joinedDate: new Date().toISOString().split('T')[0],
          };
        } catch (e) {
          console.log('[resolveUser] Pending profile error:', e);
          safeStorage.remove('ikak_pending_profile');
        }
      }

      // 3) Fallback iz auth metadata
      console.log('[resolveUser] Using fallback from auth metadata');
      const meta = authUser.user_metadata || {};
      const email = authUser.email || '';
      const username = meta.username || email.split('@')[0] || 'user';
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
      } catch (e) {
        console.log('[resolveUser] Profile insert error:', e);
      }

      const user = {
        id: authUser.id,
        email,
        username,
        displayName,
        bio: '',
        avatarUrl,
        joinedDate: new Date().toISOString().split('T')[0],
      };
      console.log('[resolveUser] Returning fallback user:', user);
      return user;
    } catch (e) {
      console.error('[resolveUser] Error:', e);
      return null;
    }
  }, []);

  // =========================================
  // VOSSTANOVLENIE SESSII - tolko 1 raz pri zagruzke
  // =========================================
  useEffect(() => {
    if (sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;

    const restoreSession = async () => {
      try {
        console.log('[restoreSession] Starting...');
        authTimeoutRef.current = setTimeout(() => {
          console.log('[restoreSession] Timeout reached, showing auth screen');
          setAuthLoading(false);
        }, 3000);

        if (isRegisteringRef.current) {
          console.log('[restoreSession] Registration in progress, skipping');
          setAuthLoading(false);
          return;
        }

        const user = await resolveUser();
        console.log('[restoreSession] User resolved:', user ? user.username : 'null');
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          fetchPosts(user.id);
        } else {
          console.log('[restoreSession] No user, setting isAuthenticated to false');
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('[restoreSession] Error:', err);
        setIsAuthenticated(false);
      } finally {
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
        console.log('[restoreSession] Finished, authLoading = false');
        setAuthLoading(false);
      }
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
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
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
      if (error.message.includes('Invalid login')) return 'Nevernyi email ili parol';
      if (error.message.includes('Email not confirmed')) return 'Podtverdite email';
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
    // Rate limiting - zashita ot spam registracii
    if (!checkClientRateLimit('register', 5, 60000)) {
      return 'Slishkom mnogo popytok registracii. Poprobuite pozzhe.';
    }

    // Validaciya email
    if (!isValidEmail(data.email)) {
      return 'Vvedite korrektnyi email';
    }

    // Validaciya username
    if (!isValidUsername(data.username)) {
      return 'Yuzerneim: 3-20 simvolov, latinica, cifry i _';
    }

    // Validaciya parolya
    if (data.password.length < 6) {
      return 'Parol dolzhen byt ne menee 6 simvolov';
    }

    isRegisteringRef.current = true;

    // Proveryaem unikalnost yuzerneima
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', data.username.toLowerCase())
        .single();
      if (existing) {
        isRegisteringRef.current = false;
        return 'Etot yuzerneim uzhe zanyat';
      }
    } catch {
      // ignore
    }

    const seed = data.username + Date.now();
    const avatarUrl = sanitizeUrl(data.avatarUrl) || `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;

    // Sanitiziruem dannye
    const sanitizedUsername = sanitizeInput(data.username.toLowerCase(), 20);
    const sanitizedDisplayName = sokanimate(data.displayName, 50);

    // Sohranyaem pending profil v bezopasnom hranilischi
    safeStorage.set('ikak_pending_profile', {
      username: sanitizedUsername,
      displayName: sanitizedDisplayName,
      avatarUrl,
    });

    // Registraciya
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.toLowerCase(),
      password: data.password,
      options: {
        data: {
          username: sanitizedUsername,
          display_name: sanitizedDisplayName,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) {
      safeStorage.remove('ikak_pending_profile');
      isRegisteringRef.current = false;
      if (authError.message.includes('already registered')) return 'Polzovatel s takim email uzhe sushestvuet';
      return authError.message;
    }

    if (!authData.user) {
      safeStorage.remove('ikak_pending_profile');
      isRegisteringRef.current = false;
      return 'Oshibka sozdaniya akkaunta';
    }

    if (authData.user.identities && authData.user.identities.length === 0) {
      safeStorage.remove('ikak_pending_profile');
      isRegisteringRef.current = false;
      return 'Polzovatel s takim email uzhe sushestvuet';
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
      } catch {
        // pending profile podkhvatit resolveUser
      }
      return null;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email.toLowerCase(),
      password: data.password,
    });

    if (signInError) {
      return 'EMAIL_CONFIRM_REQUIRED';
    }

    try {
      await supabase.from('profiles').insert({
        id: authData.user.id,
        username: sanitizedUsername,
        display_name: sanitizedDisplayName,
        bio: '',
        avatar_url: avatarUrl,
      });
      safeStorage.remove('ikak_pending_profile');
    } catch {
      // pending profile podkhvatit resolveUser
    }

    return null;
  }, []);

  // =========================================
  // ACTIVATE SESSION - vyzovetsya Auth POSLE bota
  // =========================================
  const activateSession = useCallback(async () => {
    isRegisteringRef.current = false;

    for (let attempt = 0; attempt < 20; attempt++) {
      const user = await resolveUser();
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        setAuthLoading(false);
        fetchPosts(user.id);
        return;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    setAuthLoading(false);
  }, [fetchPosts, resolveUser]);

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
  // ADD POST (s zashitoi ot XSS i rate limiting)
  // =========================================
  const addPost = useCallback(async (content: string) => {
    if (!currentUser) return;

    if (!checkClientRateLimit('post', 10, 60000)) {
      console.warn('Rate limit exceeded for posting');
      return;
    }

    const sanitizedContent = sanitizeInput(content, 5000);
    if (!sanitizedContent) {
      console.warn('Empty or invalid post content');
      return;
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: currentUser.id, content: sanitizedContent })
      .select()
      .single();

    if (error) {
      console.error('Add post error:', error);
      return;
    }

    if (data) {
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
    }
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
  // ADD COMMENT (s zashitoi ot XSS i rate limiting)
  // =========================================
  const addComment = useCallback(async (postId: string, content: string) => {
    if (!currentUser) return;

    if (!checkClientRateLimit(`comment_${postId}`, 20, 60000)) {
      console.warn('Rate limit exceeded for comments');
      return;
    }

    const sanitizedContent = sanitizeInput(content, 1000);
    if (!sanitizedContent) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: currentUser.id, content: sanitizedContent })
      .select()
      .single();

    if (error) {
      console.error('Add comment error:', error);
      return;
    }

    if (data) {
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
    }
  }, [currentUser]);

  // =========================================
  // DELETE POST
  // =========================================
  const deletePost = useCallback(async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) {
      console.error('Delete post error:', error);
      return;
    }
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  // =========================================
  // UPDATE PROFILE (s zashitoi ot XSS)
  // =========================================
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!currentUser) return;

    const dbUpdates: Record<string, string> = {};
    
    if (updates.displayName !== undefined) {
      const sanitized = sanitizeInput(updates.displayName, 50);
      if (sanitized) dbUpdates.display_name = sanitized;
    }
    
    if (updates.username !== undefined) {
      if (isValidUsername(updates.username)) {
        dbUpdates.username = updates.username.toLowerCase();
      }
    }
    
    if (updates.bio !== undefined) {
      const sanitized = sanitizeInput(updates.bio, 500);
      dbUpdates.bio = sanitized;
    }
    
    if (updates.avatarUrl !== undefined) {
      const sanitized = sanitizeUrl(updates.avatarUrl);
      if (sanitized) dbUpdates.avatar_url = sanitized;
    }

    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', currentUser.id);

    if (error) {
      console.error('Update profile error:', error);
      return;
    }

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

  // =========================================
  // UPDATE SETTINGS
  // =========================================
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // =========================================
  // REFRESH POSTS
  // =========================================
  const refreshPosts = useCallback(() => {
    if (currentUser) {
      fetchPosts(currentUser.id);
    }
  }, [currentUser, fetchPosts]);

  return {
    currentPage, setCurrentPage,
    currentUser, isAuthenticated, authLoading,
    posts, settings,
    login, register, activateSession, logout,
    addPost, toggleLike, addComment, deletePost,
    updateProfile, updateSettings, refreshPosts,
  };
}

// Dopolnitelnaya funkciya dlya sanitizacii (opechatka v imeni)
function sokanimate(input: string, maxLength: number): string {
  return sanitizeInput(input, maxLength);
}
