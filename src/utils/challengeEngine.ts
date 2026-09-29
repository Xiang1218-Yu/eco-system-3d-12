import type { Organism } from '@/types/ecosystem';
import type {
  Challenge,
  ChallengeCompletions,
  ChallengeMetric,
  ChallengeSnapshot,
} from '@/types/challenge';
import { SPECIES, getSpeciesById } from '@/data/species';
import { CHALLENGES } from '@/data/challenges';

/** 根据当前生物列表与统计结果构建挑战判定快照 */
export function buildSnapshot(organisms: Organism[]): ChallengeSnapshot {
  const populationBySpecies: Record<string, number> = {};
  SPECIES.forEach((s) => {
    populationBySpecies[s.id] = 0;
  });
  organisms.forEach((o) => {
    populationBySpecies[o.speciesId] = (populationBySpecies[o.speciesId] || 0) + 1;
  });

  const levelCounts = {
    producer: 0,
    herbivore: 0,
    carnivore: 0,
    decomposer: 0,
  } as ChallengeSnapshot['levelCounts'];
  organisms.forEach((o) => {
    const sp = getSpeciesById(o.speciesId);
    if (sp) levelCounts[sp.trophicLevel]++;
  });

  const totalOrganisms = organisms.length;
  let balanceIndex = 0;
  if (totalOrganisms > 0) {
    const idealRatios = { producer: 0.5, herbivore: 0.3, carnivore: 0.1, decomposer: 0.1 };
    let deviation = 0;
    (Object.keys(idealRatios) as (keyof typeof idealRatios)[]).forEach((level) => {
      deviation += Math.abs(levelCounts[level] / totalOrganisms - idealRatios[level]);
    });
    balanceIndex = Math.max(0, 100 - deviation * 100);
  }

  return {
    totalOrganisms,
    populationBySpecies,
    presentSpecies: Object.values(populationBySpecies).filter((n) => n > 0).length,
    levelCounts,
    presentLevels: Object.values(levelCounts).filter((n) => n > 0).length,
    balanceIndex,
    simulationTime: 0,
  };
}

/** 读取某个挑战指标的当前原始值 */
export function readMetric(metric: ChallengeMetric, snapshot: ChallengeSnapshot): number {
  switch (metric.kind) {
    case 'totalPopulation':
      return snapshot.totalOrganisms;
    case 'speciesPopulation':
      return snapshot.populationBySpecies[metric.speciesId] || 0;
    case 'presentSpecies':
      return snapshot.presentSpecies;
    case 'trophicLevelsPresent':
      return snapshot.presentLevels;
    case 'trophicLevelCount':
      return snapshot.levelCounts[metric.level] || 0;
    case 'balanceIndex':
      return snapshot.balanceIndex;
    default:
      return 0;
  }
}

export interface ChallengeProgress {
  /** 指标当前值（持续类挑战中为指标原始值） */
  current: number;
  /** 进度条分母（持续类为持续 tick 数） */
  denominator: number;
  /** 0~1 的进度比例，用于进度条宽度 */
  ratio: number;
  /** 当前条件是否满足 */
  conditionMet: boolean;
  /** 持续类挑战中已连续满足的 tick 数 */
  streak: number;
}

/** 计算单个挑战当前进度（纯函数，不更新 streak 状态） */
export function getChallengeProgress(
  challenge: Challenge,
  snapshot: ChallengeSnapshot,
  streak: number,
): ChallengeProgress {
  const value = readMetric(challenge.metric, snapshot);
  const conditionMet = value >= challenge.target;

  if (challenge.duration) {
    return {
      current: streak,
      denominator: challenge.duration,
      ratio: Math.min(1, streak / challenge.duration),
      conditionMet,
      streak,
    };
  }

  return {
    current: value,
    denominator: challenge.target,
    ratio: Math.min(1, value / challenge.target),
    conditionMet,
    streak,
  };
}

/** 把 tick 数格式化为与生态数据面板一致的 mm:ss */
export function formatTickTime(ticks: number): string {
  const mins = Math.floor(ticks / 100);
  const secs = ticks % 100;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/** 挑战进度的展示文本，如 "12 / 20" 或 "01:20 / 03:00" */
export function formatProgressText(challenge: Challenge, progress: ChallengeProgress): string {
  if (challenge.duration) {
    return `${formatTickTime(progress.current)} / ${formatTickTime(progress.denominator)}`;
  }
  return `${Math.round(progress.current)} / ${progress.denominator}`;
}

export interface ChallengeCheckResult {
  /** 更新后的连续满足 tick 数 */
  streaks: Record<string, number>;
  /** 本次 tick 新完成（首次完成）的挑战 */
  newlyCompleted: Challenge[];
  completions: ChallengeCompletions;
  /** 本次发放的奖励总数（每个挑战只发一次） */
  rewardsEarned: number;
}

/**
 * 运行中持续调用：检查所有挑战条件。
 * - 持续类：条件满足时累加 streak，中断则归零；streak 达到 duration 才完成。
 * - 瞬时类：条件满足即完成。
 * - 已完成的挑战不再重复判定、不再重复发奖。
 */
export function checkChallenges(params: {
  snapshot: ChallengeSnapshot;
  streaks: Record<string, number>;
  completions: ChallengeCompletions;
}): ChallengeCheckResult {
  const { snapshot, streaks, completions } = params;
  const nextStreaks: Record<string, number> = { ...streaks };
  const nextCompletions: ChallengeCompletions = { ...completions };
  const newlyCompleted: Challenge[] = [];
  let rewardsEarned = 0;

  for (const challenge of CHALLENGES) {
    if (nextCompletions[challenge.id]) {
      // 已完成：保持 streak 清零，不再重复发奖
      nextStreaks[challenge.id] = 0;
      continue;
    }

    const value = readMetric(challenge.metric, snapshot);
    const conditionMet = value >= challenge.target;

    if (challenge.duration) {
      const streak = conditionMet ? (nextStreaks[challenge.id] || 0) + 1 : 0;
      nextStreaks[challenge.id] = streak;
      if (streak >= challenge.duration) {
        nextCompletions[challenge.id] = Date.now();
        newlyCompleted.push(challenge);
        rewardsEarned += challenge.reward;
        nextStreaks[challenge.id] = 0;
      }
    } else if (conditionMet) {
      nextCompletions[challenge.id] = Date.now();
      newlyCompleted.push(challenge);
      rewardsEarned += challenge.reward;
      nextStreaks[challenge.id] = 0;
    } else {
      nextStreaks[challenge.id] = 0;
    }
  }

  return {
    streaks: nextStreaks,
    newlyCompleted,
    completions: nextCompletions,
    rewardsEarned,
  };
}
