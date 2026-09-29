import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Trophy, Star } from 'lucide-react';
import { useChallengeStore } from '@/store/useChallengeStore';

const CONFETTI_COLORS = ['#4ADE80', '#22D3EE', '#F472B6', '#FBBF24', '#C084FC', '#FFFFFF'];

/**
 * 成就达成动画。
 * 只在挑战“首次完成”时由 store 推入 activeAchievement 才会出现，
 * 奖励只发一次，因此同一挑战不会重复播放。
 */
export function AchievementToast() {
  const activeAchievement = useChallengeStore((s) => s.activeAchievement);
  const dismissActiveAchievement = useChallengeStore((s) => s.dismissActiveAchievement);

  useEffect(() => {
    if (!activeAchievement) return;
    const timer = window.setTimeout(dismissActiveAchievement, 3600);
    return () => window.clearTimeout(timer);
  }, [activeAchievement, dismissActiveAchievement]);

  if (!activeAchievement) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
      <div className="achievement-pop relative">
        {/* 彩带/星光爆发 */}
        <div className="absolute inset-0 overflow-visible">
          {CONFETTI_COLORS.map((color, i) => (
            <span
              key={`${activeAchievement.challengeId}-${i}`}
              className="achievement-confetti absolute left-1/2 top-1/2 block w-1.5 h-2.5 rounded-sm"
              style={{
                backgroundColor: color,
                animationDelay: `${i * 0.08}s`,
                '--burst-x': `${Math.cos((i / CONFETTI_COLORS.length) * Math.PI * 2) * 90}px`,
                '--burst-y': `${Math.sin((i / CONFETTI_COLORS.length) * Math.PI * 2) * 60 - 30}px`,
              } as CSSProperties}
            />
          ))}
        </div>

        <div className="relative flex items-center gap-3 px-5 py-3 rounded-2xl border-2 border-amber-300/70 bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(251,191,36,0.5)]">
          <div className="achievement-trophy-glow w-12 h-12 rounded-full bg-amber-400/30 flex items-center justify-center shrink-0">
            <Trophy size={26} className="text-amber-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-amber-200/90 text-[11px] font-bold tracking-widest uppercase flex items-center gap-1">
              <Star size={11} className="fill-amber-300 text-amber-300" />
              挑战达成
            </span>
            <span className="text-white font-bold text-lg leading-tight">
              {activeAchievement.icon} {activeAchievement.title}
            </span>
            <span className="text-amber-300 text-xs font-medium">
              +{activeAchievement.reward} 积分奖励
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
