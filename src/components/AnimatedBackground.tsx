import { useMemo } from 'react';

interface AnimatedBackgroundProps {
  variant?: 'auth' | 'app';
}

// Детерминированный генератор псевдослучайных чисел
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function AnimatedBackground({ variant = 'app' }: AnimatedBackgroundProps) {
  const particles = useMemo(() => {
    return Array.from({ length: variant === 'auth' ? 30 : 15 }).map((_, i) => {
      const seed1 = seededRandom(i);
      const seed2 = seededRandom(i + 100);
      const seed3 = seededRandom(i + 200);
      const seed4 = seededRandom(i + 300);
      const seed5 = seededRandom(i + 400);

      return {
        id: i,
        left: `${seed1 * 100}%`,
        top: `${seed2 * 100}%`,
        size: 1 + seed3 * 2.5,
        duration: 8 + seed4 * 20,
        delay: seed5 * 15,
        drift: seed1 > 0.5,
        color: ['#6366f1', '#8b5cf6', '#a78bfa', '#818cf8', '#c084fc', '#38bdf8'][Math.floor(seed2 * 6)],
      };
    });
  }, [variant]);

  const shootingStars = useMemo(() => {
    return Array.from({ length: variant === 'auth' ? 4 : 2 }).map((_, i) => {
      const seed1 = seededRandom(i + 500);
      const seed2 = seededRandom(i + 600);
      const seed3 = seededRandom(i + 700);
      const seed4 = seededRandom(i + 800);

      return {
        id: i,
        top: `${10 + seed1 * 40}%`,
        left: `${seed2 * 60}%`,
        duration: 6 + seed3 * 8,
        delay: i * 5 + seed4 * 10,
        angle: -25 + seed1 * 10,
      };
    });
  }, [variant]);

  if (variant === 'auth') {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Deep space base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0c0a1a_0%,_#050507_70%)]" />

        {/* Large orbiting blobs */}
        <div className="blob-1 absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-indigo-600/[0.07] blur-[120px]" />
        <div className="blob-2 absolute top-[50%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-600/[0.08] blur-[100px]" />
        <div className="blob-3 absolute bottom-[10%] left-[30%] w-[450px] h-[450px] rounded-full bg-violet-500/[0.06] blur-[110px]" />
        <div className="blob-4 absolute top-[30%] right-[40%] w-[350px] h-[350px] rounded-full bg-blue-500/[0.05] blur-[90px]" />

        {/* Aurora bands */}
        <div className="aurora-1 absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-indigo-500/[0.04] via-purple-500/[0.02] to-transparent" />
        <div className="aurora-2 absolute top-[10%] left-[20%] right-[20%] h-[30%] bg-gradient-to-b from-violet-400/[0.03] via-blue-500/[0.015] to-transparent rounded-full" />
        <div className="aurora-3 absolute top-[5%] left-[10%] right-[30%] h-[25%] bg-gradient-to-br from-cyan-500/[0.02] via-indigo-500/[0.03] to-transparent rounded-full" />

        {/* Mesh gradient - slowly rotating */}
        <div className="animate-mesh-rotate absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.03]">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,_#6366f1,_#8b5cf6,_#06b6d4,_#6366f1)] rounded-full blur-[80px]" />
        </div>

        {/* Glow centers */}
        <div className="animate-glow-breathe absolute top-[20%] left-[25%] w-64 h-64 bg-indigo-500 rounded-full" />
        <div className="animate-glow-breathe absolute bottom-[30%] right-[20%] w-48 h-48 bg-purple-500 rounded-full" style={{ animationDelay: '3s' }} />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 animate-grid-pulse"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_30%,_#050507_100%)]" />

        {/* Floating particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className={p.drift ? 'particle-drift' : 'particle'}
            style={{
              position: 'absolute',
              left: p.left,
              bottom: '-10px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: '50%',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            }}
          />
        ))}

        {/* Shooting stars */}
        {shootingStars.map(s => (
          <div
            key={s.id}
            className="shooting-star absolute"
            style={{
              top: s.top,
              left: s.left,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
              transform: `rotate(${s.angle}deg)`,
            }}
          />
        ))}

        {/* Ripple rings */}
        <div className="absolute top-[15%] right-[20%] w-32 h-32 rounded-full border border-indigo-500/[0.06] animate-ripple" />
        <div className="absolute bottom-[25%] left-[15%] w-40 h-40 rounded-full border border-purple-500/[0.05] animate-ripple" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[60%] right-[40%] w-24 h-24 rounded-full border border-violet-500/[0.04] animate-ripple" style={{ animationDelay: '4s' }} />
      </div>
    );
  }

  // App variant - more subtle
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0a0815_0%,_#050507_60%)]" />

      {/* Subtle blobs */}
      <div className="blob-1 absolute top-[5%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/[0.035] blur-[130px]" />
      <div className="blob-2 absolute bottom-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-purple-600/[0.04] blur-[120px]" />
      <div className="blob-3 absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full bg-violet-500/[0.025] blur-[100px]" />

      {/* Subtle aurora */}
      <div className="aurora-1 absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-indigo-500/[0.02] via-transparent to-transparent" />

      {/* Faint grid */}
      <div
        className="absolute inset-0 animate-grid-pulse"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          opacity: 0.5,
        }}
      />

      {/* Particles - fewer */}
      {particles.map(p => (
        <div
          key={p.id}
          className={p.drift ? 'particle-drift' : 'particle'}
          style={{
            position: 'absolute',
            left: p.left,
            bottom: '-10px',
            width: `${p.size * 0.7}px`,
            height: `${p.size * 0.7}px`,
            backgroundColor: p.color,
            borderRadius: '50%',
            animationDuration: `${p.duration * 1.5}s`,
            animationDelay: `${p.delay}s`,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            opacity: 0.5,
          }}
        />
      ))}

      {/* Shooting stars - rare */}
      {shootingStars.map(s => (
        <div
          key={s.id}
          className="shooting-star absolute"
          style={{
            top: s.top,
            left: s.left,
            animationDuration: `${s.duration * 1.5}s`,
            animationDelay: `${s.delay * 2}s`,
            transform: `rotate(${s.angle}deg)`,
            opacity: 0.5,
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_40%,_#050507_100%)]" />
    </div>
  );
}
