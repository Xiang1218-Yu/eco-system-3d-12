import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CHALLENGES } from '@/data/challenges';
import type { ChallengeMetrics, ChallengeProgress } from '@/types/challenge';
import { evaluateChallenge } from '@/data/challenges';

/** 刚刚达成、正在播放成就动画的挑战（瞬态，不持久化） */
export interface ActiveAchievement {
  challengeId: string;
  title: string;
  icon: string;
  reward: number;
}

interface ChallengeStore {
  /** 每个挑战的进度与完成状态，持久化保存 */
  progress: Record<string, ChallengeProgress>;
  /** 已获得的总积分（奖励只发一次） */
  totalScore: number;
  /** 正在播放动画的成就 */
  activeAchievement: ActiveAchievement | null;
  /** 同一 tick 多个挑战同时完成时，排队依次播放 */
  achievementQueue: ActiveAchievement[];

  /**
   * 用最新指标持续检查所有挑战。
   * 仅在“首次完成”时把成就推入队列并发放奖励；已完成的挑战不会重复发奖。
   */  checkChallenges: (metrics: ChallengeMetrics) => void;
  dismissActiveAchievement: () => void;
  resetAll: () => void;
  getCompletedCount: () => number;
}

function createInitialProgress(): Record<string, ChallengeProgress> {
  const initial: Record<string, ChallengeProgress> = {};
  CHALLENGES.forEach((c) => {
    initial[c.id] = { progress: 0, completed: false, completedAt: null, rewarded: false };
  });
  return initial;
}

export const useChallengeStore = create<ChallengeStore>()(
  persist(
    (set, get) => ({
      progress: createInitialProgress(),
      totalScore: 0,
      activeAchievement: null,
      achievementQueue: [],

      checkChallenges: (metrics) => {
        const state = get();
        let changed = false;
        let scoreGain = 0;
        const newlyCompleted: ActiveAchievement[] = [];

        const nextProgress: Record<string, ChallengeProgress> = { ...state.progress };

        for (const def of CHALLENGES) {
          const evaluation = evaluateChallenge(def, metrics);
          const prev = nextProgress[def.id] ?? {
            progress: 0,
            completed: false,
            completedAt: null,
            rewarded: false,
          };

          // 历史最高进度（用于进度条在指标回落时仍保留曾经达到的进度）
          const bestProgress = Math.max(prev.progress, evaluation.current);

          if (prev.completed) {
            // 已完成：只同步最高进度，绝不再发奖励
            if (bestProgress !== prev.progress) {
              nextProgress[def.id] = { ...prev, progress: bestProgress };
              changed = true;
            }
            continue;
          }

          if (evaluation.completed) {
            // 首次完成：记录完成状态、发奖（只此一次）、排队播放成就动画
            const reward = prev.rewarded ? 0 : def.reward;
            scoreGain += reward;
            nextProgress[def.id] = {
              progress: Math.max(bestProgress, def.target),
              completed: true,
              completedAt: Date.now(),
              rewarded: true,
            };
            newlyCompleted.push({
              challengeId: def.id,
              title: def.title,
              icon: def.icon,
              reward: def.reward,
            });
            changed = true;
          } else if (bestProgress !== prev.progress) {
            nextProgress[def.id] = { ...prev, progress: bestProgress };
            changed = true;
          }
        }

        if (!changed && newlyCompleted.length === 0) return;

        const queue = [...state.achievementQueue, ...newlyCompleted];
        set({
          ...(changed ? { progress: nextProgress } : {}),
          ...(scoreGain > 0 ? { totalScore: state.totalScore + scoreGain } : {}),
          achievementQueue: queue,
          // 当前没有播放中的成就时，立即播放第一个；否则等 dismiss 后再出队
          activeAchievement: state.activeAchievement ?? queue[0] ?? null,
        });
      },

      dismissActiveAchievement: () => {
        const state = get();
        const remaining = state.achievementQueue.filter(
          (a) => a.challengeId !== state.activeAchievement?.challengeId,
        );
        set({
          activeAchievement: remaining[0] ?? null,
          achievementQueue: remaining,
        });
      },

      resetAll: () => {
        set({
          progress: createInitialProgress(),
          totalScore: 0,
          activeAchievement: null,
          achievementQueue: [],
        });
      },

      getCompletedCount: () => {
        const p = get().progress;
        return CHALLENGES.filter((c) => p[c.id]?.completed).length;
      },
    }),
    {
      name: 'ecosystem-challenges-v1',
      // activeAchievement / achievementQueue 是瞬态动画，刷新后不应继续播放，故只持久化进度与积分
      partialize: (state) => ({
        progress: state.progress,
        totalScore: state.totalScore,
      }),
    },
  ),
);
