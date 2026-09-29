import { useEffect } from 'react';
import { useEcosystemStore } from '@/store/useEcosystemStore';
import { useChallengeStore } from '@/store/useChallengeStore';
import { computeChallengeMetrics } from '@/data/challenges';

/**
 * 运行中持续检查挑战条件。
 *
 * 订阅生态缸的生物体、模拟时间与运行状态：
 * - 模拟运行时每个 tick（simulationTime 增长）都会检查；
 * - 暂停状态下放置 / 移除生物导致数量变化时也会即时检查；
 * 因此无需侵入模拟器内部，纯由前端状态驱动。
 */
export function useChallengeChecker() {
  const organisms = useEcosystemStore((s) => s.organisms);
  const simulationTime = useEcosystemStore((s) => s.simulationTime);
  const isRunning = useEcosystemStore((s) => s.isRunning);
  const checkChallenges = useChallengeStore((s) => s.checkChallenges);

  useEffect(() => {
    const stats = useEcosystemStore.getState().getStats();
    const metrics = computeChallengeMetrics(
      organisms.map((o) => o.speciesId),
      organisms.map((o) => o.age),
      simulationTime,
      stats.balanceIndex,
    );
    checkChallenges(metrics);
  }, [organisms, simulationTime, isRunning, checkChallenges]);
}
