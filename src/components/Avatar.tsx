import { cn } from '../utils/cn';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  online?: boolean;
  ring?: boolean;
}

const sizes = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

const onlineDots = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border-[1.5px]',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

export function Avatar({ src, alt, size = 'md', className, online, ring }: AvatarProps) {
  const initials = alt
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'rounded-full bg-zinc-800/80 flex items-center justify-center overflow-hidden',
          sizes[size],
          ring && 'ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-[#050507]'
        )}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className={cn(
            'text-zinc-400 font-semibold',
            size === 'xs' ? 'text-[8px]' : size === 'sm' ? 'text-[10px]' : 'text-xs'
          )}>{initials}</span>
        )}
      </div>
      {online && (
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full bg-emerald-500 border-[#050507]',
          onlineDots[size]
        )} />
      )}
    </div>
  );
}
