import type { TrophicLevel } from '@/types/ecosystem';

/** 挑战类别：数量 / 营养级 / 存活时间 / 环境结果 */
export type ChallengeCategory = 'quantity' | 'trophic' | 'survival' | 'environment';

/** 挑战所度量的指标 */
export type ChallengeMetric =
  | { kind: 'totalPopulation' }
  | { kind: 'speciesPopulation'; speciesId: string }
  | { kind: 'presentSpecies' }
  | { kind: 'trophicLevelsPresent' }
  | { kind: 'trophicLevelCount'; level: TrophicLevel }
  | { kind: 'balanceIndex' };

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: ChallengeCategory;
  categoryLabel: string;
  metric: ChallengeMetric;
  /** 指标需要达到的阈值 */
  target: number;
  /** 需要持续满足条件的 tick 数；缺省表示瞬时达成 */
  duration?: number;
  /** 首次完成奖励的科研点 */
  reward: number;
}

/** 每个 tick 用于挑战判定的生态快照 */
export interface ChallengeSnapshot {
  totalOrganisms: number;
  populationBySpecies: Record<string, number>;
  presentSpecies: number;
  levelCounts: Record<TrophicLevel, number>;
  presentLevels: number;
  balanceIndex: number;
  simulationTime: number;
}

/** 挑战的完成记录：challengeId -> 完成时间戳 */
export type ChallengeCompletions = Record<string, number>;

/** 成就动画队列项 */
export interface AchievementQueueItem {
  id: string;
  challengeId: string;
}
