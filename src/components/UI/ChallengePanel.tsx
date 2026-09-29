import { useEffect, useMemo, useState } from 'react';
import { Target, ChevronDown, ChevronUp, CheckCircle2, RotateCcw, Award } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { useEcosystemStore } from '@/store/useEcosystemStore';
import { useChallengeStore } from '@/store/useChallengeStore';
import {
  CHALLENGES,
  CHALLENGE_CATEGORY_LABELS,
  CHALLENGE_CATEGORY_COLORS,
  computeChallengeMetrics,
  evaluateChallenge,
} from '@/data/challenges';

function formatTime(t: number): string {
  const mins = Math.floor(t / 100);
  const secs = t % 100;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function ChallengePanel() {
  const organisms = useEcosystemStore((s) => s.organisms);
  const simulationTime = useEcosystemStore((s) => s.simulationTime);
  const progress = useChallengeStore((s) => s.progress);
  const totalScore = useChallengeStore((s) => s.totalScore);
  const resetAll = useChallengeStore((s) => s.resetAll);
  const selectedOrganismId = useEcosystemStore((s) => s.selectedOrganismId);

  // 选中某个生物（信息卡占据右侧）时自动收起，避免与信息卡重叠
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (selectedOrganismId) setCollapsed(true);
  }, [selectedOrganismId]);

  const metrics = useMemo(() => {
    const stats = useEcosystemStore.getState().getStats();
    return computeChallengeMetrics(
      organisms.map((o) => o.speciesId),
      organisms.map((o) => o.age),
      simulationTime,
      stats.balanceIndex,
    );
  }, [organisms, simulationTime]);

  const completedCount = CHALLENGES.filter((c) => progress[c.id]?.completed).length;

  const formatValue = (challengeId: string, value: number): string => {
    if (challengeId === 'survive-longrun') return formatTime(Math.round(value));
    return `${Math.round(value)}`;
  };

  return (
    <div className="absolute right-4 z-30 w-72" style={{ top: '4.5rem' }}>
      <GlassCard className="p-4">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Target size={18} className="text-amber-300" />
            挑战模式
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
              <Award size={13} /> {totalScore}
            </span>
            <span className="text-xs text-white/60">
              {completedCount}/{CHALLENGES.length}
            </span>
            {collapsed ? <ChevronDown size={16} className="text-white/60" /> : <ChevronUp size={16} className="text-white/60" />}
          </div>
        </button>

        {!collapsed && (
          <>
            {/* 总进度条 */}
            <div className="mt-3 mb-3">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500"
                  style={{
                    width: `${(completedCount / CHALLENGES.length) * 100}%`,
                    boxShadow: '0 0 8px rgba(251,191,36,0.7)',
                  }}
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1 scrollbar-thin">
              {CHALLENGES.map((def) => {
                const evaluation = evaluateChallenge(def, metrics);
                const saved = progress[def.id];
                const completed = !!saved?.completed;
                const color = CHALLENGE_CATEGORY_COLORS[def.category];

                // 完成后永久 100%；未完成时取“当前值”与“历史最高”的较大者展示
                const shownFraction = completed
                  ? 1
                  : Math.max(evaluation.fraction, def.target ? (saved?.progress ?? 0) / def.target : 0);
                const shownCurrent = completed
                  ? def.target
                  : Math.max(evaluation.current, saved?.progress ?? 0);

                return (
                  <div
                    key={def.id}
                    className={`rounded-xl p-2.5 border transition-all duration-300 ${
                      completed ? 'bg-amber-400/10 border-amber-300/40' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ background: `${color}25` }}
                      >
                        {completed ? <CheckCircle2 size={18} className="text-amber-300" /> : def.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold ${completed ? 'text-amber-200' : 'text-white'}`}>
                            {def.title}
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-px rounded-full shrink-0"
                            style={{ backgroundColor: `${color}30`, color }}
                          >
                            {CHALLENGE_CATEGORY_LABELS[def.category]}
                          </span>
                        </div>
                        <p className="text-white/50 text-[10px] leading-snug mt-0.5">{def.description}</p>

                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden mr-2">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${shownFraction * 100}%`,
                                backgroundColor: completed ? '#FBBF24' : color,
                                boxShadow: completed ? '0 0 8px rgba(251,191,36,0.8)' : `0 0 6px ${color}80`,
                              }}
                            />
                          </div>
                          <span className={`text-[10px] font-mono shrink-0 ${completed ? 'text-amber-300' : 'text-white/60'}`}>
                            {formatValue(def.id, shownCurrent)}/{formatValue(def.id, def.target)}
                            {def.unit ?? ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                if (window.confirm('确定要清空所有挑战进度与积分吗？此操作不可撤销。')) {
                  resetAll();
                }
              }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-red-500/20 hover:text-red-300 transition-colors text-xs"
              title="清空挑战进度"
            >
              <RotateCcw size={12} /> 重置挑战进度
            </button>
          </>
        )}
      </GlassCard>
    </div>
  );
}
