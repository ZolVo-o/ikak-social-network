import { useState } from 'react';
import { Heart, MessageCircle, Trash2, Send, RefreshCw, Sparkles } from 'lucide-react';
import type { Post, User } from '../types';
import { cn } from '../utils/cn';
import { Avatar } from './Avatar';

interface FeedProps {
  posts: Post[];
  currentUser: User;
  onAddPost: (content: string) => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onDeletePost: (postId: string) => void;
  onRefresh?: () => void;
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

function PostCard({
  post, currentUserId, onToggleLike, onAddComment, onDelete,
}: {
  post: Post; currentUserId: string;
  onToggleLike: () => void; onAddComment: (c: string) => void; onDelete: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [likeAnim, setLikeAnim] = useState(false);

  const handleLike = () => {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 600);
    onToggleLike();
  };

  const submitComment = () => {
    const t = commentText.trim();
    if (!t) return;
    onAddComment(t);
    setCommentText('');
  };

  return (
    <article className="group rounded-2xl bg-white/[0.02] border border-white/[0.05] p-5 card-hover animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar src={post.avatarUrl} alt={post.displayName} size="md" online />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100 text-[13px]">{post.displayName}</span>
            <span className="text-zinc-600 text-xs">@{post.username}</span>
            <span className="text-zinc-700 text-xs">·</span>
            <span className="text-zinc-600 text-xs">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        {post.userId === currentUserId && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all duration-300 p-1.5 rounded-lg hover:bg-red-500/10"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <p className="text-zinc-200 text-[15px] leading-[1.7] whitespace-pre-wrap break-words pl-[52px]">
        {post.content}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-4 pl-[52px]">
        <button
          onClick={handleLike}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 group/like',
            post.liked
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5'
          )}
        >
          <Heart
            size={16}
            className={cn(
              'transition-all duration-300',
              post.liked && 'fill-current',
              likeAnim && 'animate-heartbeat'
            )}
          />
          <span>{post.likes || ''}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300',
            showComments
              ? 'text-indigo-400 bg-indigo-500/10'
              : 'text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/5'
          )}
        >
          <MessageCircle size={16} />
          <span>{post.comments.length || ''}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 ml-[52px] space-y-3 animate-fade-in">
          {post.comments.length > 0 && (
            <div className="space-y-2.5">
              {post.comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar src={c.avatarUrl} alt={c.displayName} size="xs" />
                  <div className="flex-1">
                    <div className="inline-block bg-white/[0.04] rounded-2xl rounded-tl-md px-3.5 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-semibold text-zinc-300">{c.displayName}</span>
                        <span className="text-[10px] text-zinc-600">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-zinc-300 text-[13px] leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
              placeholder="Ответить..."
              className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <button
              onClick={submitComment}
              disabled={!commentText.trim()}
              className={cn(
                'p-2 rounded-xl transition-all duration-300',
                commentText.trim()
                  ? 'text-indigo-400 hover:bg-indigo-500/10'
                  : 'text-zinc-700'
              )}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export function Feed({ posts, currentUser, onAddPost, onToggleLike, onAddComment, onDeletePost, onRefresh }: FeedProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAddPost(t);
    setText('');
    setFocused(false);
  };

  const handleRefresh = () => {
    if (!onRefresh) return;
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 pt-6 pb-4 bg-[#050507]/80 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white tracking-tight">Лента</h2>
            <Sparkles size={18} className="text-indigo-400 animate-pulse-soft" />
          </div>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className={cn(
                'p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all duration-300',
                refreshing && 'animate-spin text-indigo-400'
              )}
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className={cn(
        'rounded-2xl p-4 mb-6 transition-all duration-500',
        focused
          ? 'bg-white/[0.04] border border-indigo-500/20 shadow-lg shadow-indigo-500/5'
          : 'bg-white/[0.02] border border-white/[0.05]'
      )}>
        <div className="flex gap-3">
          <Avatar src={currentUser.avatarUrl} alt={currentUser.displayName} size="md" ring={focused} />
          <div className="flex-1">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && submit()}
              onFocus={() => setFocused(true)}
              onBlur={() => !text && setFocused(false)}
              placeholder="Что нового?"
              className="w-full resize-none bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none text-[15px] leading-relaxed"
              rows={focused ? 3 : 1}
            />

            {(focused || text) && (
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.04] animate-fade-in">
                <span className={cn(
                  'text-[11px] font-medium transition-colors',
                  text.length > 450 ? 'text-amber-400' : text.length > 0 ? 'text-zinc-500' : 'text-zinc-700'
                )}>
                  {text.length > 0 ? `${text.length}/500` : '⌘+Enter'}
                </span>
                <button
                  onClick={submit}
                  disabled={!text.trim()}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-300',
                    text.trim()
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                  )}
                >
                  <Send size={13} />
                  <span>Отправить</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3 pb-24 md:pb-8">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUser.id}
            onToggleLike={() => onToggleLike(post.id)}
            onAddComment={(c) => onAddComment(post.id, c)}
            onDelete={() => onDeletePost(post.id)}
          />
        ))}
        {posts.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="relative mx-auto w-32 h-32 mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-2xl animate-pulse" />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/[0.06] flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/[0.04] flex items-center justify-center">
                  <Sparkles size={28} className="text-indigo-400/60" />
                </div>
              </div>
            </div>
            <p className="text-zinc-200 font-bold text-xl mb-2">Лента пуста</p>
            <p className="text-zinc-500 text-sm mb-1">Здесь пока никто ничего не написал</p>
            <p className="text-zinc-600 text-xs">Будьте первым — напишите что-нибудь выше ☝️</p>
            <div className="mt-8 flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500/30 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-500/30 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-indigo-500/30 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
