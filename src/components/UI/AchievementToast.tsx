import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useEcosystemStore } from '@/store/useEcosystemStore';
import { getChallengeById } from '@/data/challenges';

const DISPLAY_DURATION = 3500;

/**
 * 成就动画：仅当挑战「首次完成」时由 store 入队触发。
 * 同一挑战完成记录持久化后不会再次入队，因此不会重复播放/发奖。
 */
export function AchievementToast() {
  const achievementQueue = useEcosystemStore((s) => s.achievementQueue);
  const dismissAchievement = useEcosystemStore((s) => s.dismissAchievement);
  const [leaving, setLeaving] = useState(false);

  const current = achievementQueue[0];
  const challenge = current ? getChallengeById(current.challengeId) : undefined;

  useEffect(() => {
    if (!current) return;
    setLeaving(false);

    const leaveTimer = window.setTimeout(() => setLeaving(true), DISPLAY_DURATION - 500);
    const dismissTimer = window.setTimeout(() => {
      dismissAchievement(current.id);
    }, DISPLAY_DURATION);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [current, dismissAchievement]);

  if (!current || !challenge) return null;

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`relative flex flex-col items-center achievement-pop ${leaving ? 'achievement-leave' : ''}`}
      >
        {/* 光环 */}
        <div className="absolute inset-0 -m-6 rounded-full bg-yellow-400/20 blur-2xl animate-pulse" />

        {/* 奖章 */}
        <div className="relative w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-2 bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-[0_0_30px_rgba(250,204,21,0.6)] border-4 border-yellow-200/80 animate-achievement-medal">
          {challenge.icon}
          <div className="absolute -inset-2 rounded-full border-2 border-yellow-300/50 animate-ping" />
        </div>

        <div className="relative bg-white/15 backdrop-blur-xl border border-yellow-300/40 rounded-2xl px-6 py-3 text-center shadow-2xl">
          <div className="flex items-center justify-center gap-1.5 text-yellow-300 text-xs font-bold tracking-widest mb-0.5">
            <Star size={12} className="fill-yellow-300" />
            挑战达成
            <Star size={12} className="fill-yellow-300" />
          </div>
          <div className="text-white font-bold text-lg leading-tight">{challenge.title}</div>
          <div className="text-yellow-200 text-sm font-bold mt-0.5 flex items-center justify-center gap-1">
            <Star size={13} className="fill-yellow-300 text-yellow-300" />
            科研点 +{challenge.reward}
          </div>
        </div>
      </div>
    </div>
  );
}
