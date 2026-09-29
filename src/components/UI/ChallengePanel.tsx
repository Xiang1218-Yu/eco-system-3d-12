import { useEffect, useMemo, useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, Check, Star } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { useEcosystemStore } from '@/store/useEcosystemStore';
import { CHALLENGES } from '@/data/challenges';
import {
  buildSnapshot,
  formatProgressText,
  getChallengeProgress,
} from '@/utils/challengeEngine';

const CATEGORY_COLORS: Record<string, string> = {
  quantity: '#22D3EE',
  trophic: '#F472B6',
  survival: '#FBBF24',
  environment: '#4ADE80',
};

export function ChallengePanel() {
  const organisms = useEcosystemStore((s) => s.organisms);
  const simulationTime = useEcosystemStore((s) => s.simulationTime);
  const challengeStreaks = useEcosystemStore((s) => s.challengeStreaks);
  const challengeCompletions = useEcosystemStore((s) => s.challengeCompletions);
  const researchPoints = useEcosystemStore((s) => s.researchPoints);
  const selectedOrganismId = useEcosystemStore((s) => s.selectedOrganismId);

  const [collapsed, setCollapsed] = useState(false);

  // 展示生物详情卡时自动收起，避免右侧面板重叠
  useEffect(() => {
    if (selectedOrganismId) setCollapsed(true);
  }, [selectedOrganismId]);

  const snapshot = useMemo(
    () => buildSnapshot(organisms),
    // simulationTime 触发随模拟 tick 刷新
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organisms, simulationTime],
  );

  const completedCount = CHALLENGES.filter((c) => challengeCompletions[c.id]).length;
  const progressPercent = (completedCount / CHALLENGES.length) * 100;

  return (
    <div className="absolute right-4 top-20 z-30 w-72">
      <GlassCard className="overflow-hidden">
        {/* 头部：始终显示，折叠时只保留这一行 */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" />
            <h3 className="text-white font-bold text-base">挑战任务</h3>
            <span className="text-white/50 text-xs">
              {completedCount}/{CHALLENGES.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-yellow-300 text-xs font-bold bg-yellow-500/20 px-2 py-0.5 rounded-full">
              <Star size={11} /> {researchPoints}
            </span>
            {collapsed ? <ChevronDown size={16} className="text-white/60" /> : <ChevronUp size={16} className="text-white/60" />}
          </div>
        </button>

        {!collapsed && (
          <>
            {/* 总进度条 */}
            <div className="px-4 pb-3">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%`, boxShadow: '0 0 8px #facc15' }}
                />
              </div>
            </div>

            <div className="max-h-[calc(100vh-24rem)] overflow-y-auto scrollbar-thin px-3 pb-3 space-y-2">
              {CHALLENGES.map((challenge) => {
                const completedAt = challengeCompletions[challenge.id];
                const isCompleted = Boolean(completedAt);
                const streak = challengeStreaks[challenge.id] || 0;
                const progress = getChallengeProgress(challenge, snapshot, streak);
                const accent = CATEGORY_COLORS[challenge.category];

                return (
                  <div
                    key={challenge.id}
                    className={`rounded-xl border p-2.5 transition-all duration-300 ${
                      isCompleted
                        ? 'bg-yellow-500/10 border-yellow-400/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{
                          background: isCompleted
                            ? 'radial-gradient(circle at 30% 30%, #facc1580, #facc1520)'
                            : `radial-gradient(circle at 30% 30%, ${accent}50, ${accent}15)`,
                        }}
                      >
                        {isCompleted ? <Check size={16} className="text-yellow-300" /> : challenge.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-sm font-medium truncate ${isCompleted ? 'text-yellow-200' : 'text-white'}`}>
                            {challenge.title}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-px rounded-full shrink-0"
                            style={{ backgroundColor: accent + '30', color: accent }}
                          >
                            {challenge.categoryLabel}
                          </span>
                        </div>
                        <p className="text-white/50 text-[11px] leading-snug mt-0.5">
                          {challenge.description}
                        </p>

                        <div className="mt-1.5">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[10px] text-yellow-300/80 flex items-center gap-0.5">
                              <Star size={9} /> +{challenge.reward}
                            </span>
                            <span className={`text-[10px] font-mono ${isCompleted ? 'text-yellow-300' : 'text-white/60'}`}>
                              {isCompleted ? '已完成' : formatProgressText(challenge, progress)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${isCompleted ? 100 : progress.ratio * 100}%`,
                                backgroundColor: isCompleted ? '#facc15' : accent,
                                boxShadow: `0 0 6px ${isCompleted ? '#facc15' : accent}`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}
