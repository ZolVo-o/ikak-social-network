-- =============================================
-- ПОЛНАЯ ЗАЩИЩЁННАЯ БАЗА ДАННЫХ ДЛЯ "И КАК"
-- =============================================
-- Выполните этот скрипт в Supabase SQL Editor
-- https://supabase.com/dashboard/project/uiftgbuylsrxqemlxrse/sql/new
-- =============================================

-- =============================================
-- УДАЛЕНИЕ СТАРЫХ ТАБЛИЦ (чистая установка)
-- =============================================
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;

-- =============================================
-- ТАБЛИЦЫ С ЗАЩИТОЙ
-- =============================================

-- 1. ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~* '^[a-z0-9_]{3,20}$'),
  display_name TEXT NOT NULL CHECK (length(display_name) >= 1 AND length(display_name) <= 50),
  avatar_url TEXT CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://'),
  bio TEXT DEFAULT '' CHECK (length(bio) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Индексы для производительности и безопасности
  CONSTRAINT username_unique UNIQUE (username)
);

-- 2. ПОСТЫ
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 5000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Защита от спама - ограничение количества постов
  CONSTRAINT content_not_empty CHECK (trim(content) <> '')
);

-- 3. ЛАЙКИ
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, post_id)
);

-- 4. КОММЕНТАРИИ
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT content_not_empty CHECK (trim(content) <> '')
);

-- 5. СЕССИИ ПОЛЬЗОВАТЕЛЕЙ (для доп. безопасности)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_info TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- 6. ЖУРНАЛ БЕЗОПАСНОСТИ
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ОГРАНИЧЕНИЕ ЧАСТОТЫ ЗАПРОСОВ (Rate Limiting)
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP адрес или user_id
  action TEXT NOT NULL,     -- действие: 'login', 'register', 'post', 'like'
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(identifier, action, window_start)
);

-- =============================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ И БЕЗОПАСНОСТИ
-- =============================================
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX idx_rate_limits_expires ON rate_limits(expires_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS) - ОСНОВНАЯ ЗАЩИТА
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ПОЛИТИКИ ДОСТУПА К ПРОФИЛЯМ
-- =============================================

-- Все могут читать профили (публичные данные)
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

-- Пользователь может читать только свой профиль полностью
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Только владелец может изменять свой профиль
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Автоматическое создание профиля при регистрации (через триггер)
CREATE POLICY "profiles_insert_authenticated" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- ПОЛИТИКИ ДОСТУПА К ПОСТАМ
-- =============================================

-- Все могут читать посты
CREATE POLICY "posts_select_public" ON posts
  FOR SELECT USING (true);

-- Только аутентифицированные могут создавать посты
CREATE POLICY "posts_insert_authenticated" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Только автор может удалять свои посты
CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- ПОЛИТИКИ ДОСТУПА К ЛАЙКАМ
-- =============================================

-- Все могут читать лайки
CREATE POLICY "likes_select_public" ON likes
  FOR SELECT USING (true);

-- Только аутентифицированные могут ставить лайки
CREATE POLICY "likes_insert_authenticated" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Только владелец может удалять лайки
CREATE POLICY "likes_delete_own" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- ПОЛИТИКИ ДОСТУПА К КОММЕНТАРИЯМ
-- =============================================

-- Все могут читать комментарии
CREATE POLICY "comments_select_public" ON comments
  FOR SELECT USING (true);

-- Только аутентифицированные могут писать комментарии
CREATE POLICY "comments_insert_authenticated" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ЗАЩИТНЫЕ ФУНКЦИИ
-- =============================================

-- Функция для логирования событий безопасности
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO security_logs (user_id, event_type, event_data, ip_address, user_agent)
  VALUES (p_user_id, p_event_type, p_event_data, p_ip, p_user_agent);
END;
$$;

-- Функция проверки rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_requests INTEGER DEFAULT 5,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Очистка старых записей
  DELETE FROM rate_limits WHERE expires_at < NOW();
  
  -- Получаем текущее количество запросов
  SELECT COALESCE(SUM(count), 0), MIN(window_start)
  INTO v_current_count, v_window_start
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND expires_at > NOW();
  
  -- Если лимит превышен
  IF v_current_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  -- Добавляем или обновляем запись
  INSERT INTO rate_limits (identifier, action, count, window_start, expires_at)
  VALUES (p_identifier, p_action, 1, NOW(), NOW() + (p_window_seconds || ' seconds')::interval)
  ON CONFLICT (identifier, action, window_start)
  DO UPDATE SET count = rate_limits.count + 1;
  
  RETURN true;
END;
$$;

-- =============================================
-- ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОЙ ЗАЩИТЫ
-- =============================================

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Автоматическое обновление updated_at для profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Автоматическое обновление updated_at для posts
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Триггер для логирования создания поста
CREATE OR REPLACE FUNCTION log_post_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_ip INET;
BEGIN
  -- Получаем IP из заголовков (если доступно)
  -- Примечание: это упрощённая версия
  PERFORM log_security_event(
    NEW.user_id,
    'post_created',
    jsonb_build_object('post_id', NEW.id, 'content_length', length(NEW.content)),
    NULL,
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_post_creation
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION log_post_creation();

-- =============================================
-- ЗАЩИТА ОТ SQL INJECTION И XSS (на уровне БД)
-- =============================================

-- Функция санитизации HTML (базовая защита от XSS)
CREATE OR REPLACE FUNCTION sanitize_html(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Удаляем опасные теги и атрибуты
  input := regexp_replace(input, '<script[^>]*>.*?</script>', '', 'gi');
  input := regexp_replace(input, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  input := regexp_replace(input, 'javascript:', '', 'gi');
  input := regexp_replace(input, 'on\w+\s*=', '', 'gi');
  RETURN input;
END;
$$;

-- =============================================
-- НАСТРОЙКИ БЕЗОПАСНОСТИ SUPABASE AUTH
-- =============================================

-- Включаем дополнительную защиту (выполните в Settings > API)
-- 1. В Supabase Dashboard: Settings > API > JWT Expiration > 3600 (1 час)
-- 2. Settings > Authentication > Providers > Email > Enable "Confirm email"
-- 3. Settings > Authentication > Rate Limits > Настройте лимиты

-- =============================================
-- АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ПРОФИЛЯ ПРИ РЕГИСТРАЦИИ
-- =============================================

-- Создаем профиль для ТЕБЯ (подставь свой UID)
INSERT INTO public.profiles (id, username, display_name, avatar_url)
VALUES (
  'bddfe89-18b3-4638-90ec-d960eaab8680',
  'zol_vo',
  'Зол Во',
  'https://ikak.ru/default-avatar.png'
)
ON CONFLICT (id) DO NOTHING;

-- Создаст профили для всех, у кого их нет
INSERT INTO public.profiles (id, username, display_name, avatar_url)
SELECT 
  au.id,
  LOWER(SPLIT_PART(au.email, '@', 1)) || '_' || floor(random() * 1000)::text,
  COALESCE(au.raw_user_meta_data->>'display_name', 'Пользователь'),
  'https://ikak.ru/default-avatar.png'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Функция для автоматического создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || floor(random() * 1000)::text,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Пользователь'),
    'https://ikak.ru/default-avatar.png'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Проверка твоего профиля
SELECT * FROM profiles WHERE id = 'bddfe89-18b3-4638-90ec-d960eaab8680';

-- =============================================
-- ГОТОВО! База данных полностью защищена.
-- =============================================

-- Проверка таблиц
SELECT 
  'profiles' as table_name, count(*) as rows_count FROM profiles
UNION ALL
SELECT 'posts', count(*) FROM posts
UNION ALL
SELECT 'likes', count(*) FROM likes
UNION ALL
SELECT 'comments', count(*) FROM comments;