export type ChallengeCategory = 'population' | 'trophic' | 'survival' | 'environment';

/** 挑战条件所依赖的、可由当前生态缸状态直接推导的指标 */
export interface ChallengeMetrics {
  /** 生物总数 */
  totalOrganisms: number;
  /** 生产者数量 */
  producers: number;
  /** 草食动物数量 */
  herbivores: number;
  /** 肉食动物数量 */
  carnivores: number;
  /** 分解者数量 */
  decomposers: number;
  /** 已出现的营养级数量（0-4） */
  trophicLevelsPresent: number;
  /** 缸内不同物种的数量 */
  speciesDiversity: number;
  /** 当前最年长生物的年龄 */
  maxAge: number;
  /** 模拟已运行的 tick 数 */
  simulationTime: number;
  /** 生态平衡指数（0-100） */
  balanceIndex: number;
}

export interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: ChallengeCategory;
  /** 取值字段，对应 ChallengeMetrics 中的键 */
  metric: keyof ChallengeMetrics;
  /** 目标值，当前值 >= target 即视为达成 */
  target: number;
  /** 首次达成时发放的积分奖励（只发一次） */
  reward: number;
  /** 数值单位，用于进度条展示 */
  unit?: string;
}

/** 单个挑战的持久化进度与完成状态 */
export interface ChallengeProgress {
  /** 历史达到过的最高值 */
  progress: number;
  /** 是否已完成（完成后永久锁定，不再发奖） */
  completed: boolean;
  /** 首次完成的时间戳 */
  completedAt: number | null;
  /** 奖励是否已发放，防止重复发奖的双保险 */
  rewarded: boolean;
}

export interface ChallengeEvaluation {
  current: number;
  target: number;
  /** 0-1 的进度比例 */
  fraction: number;
  completed: boolean;
}
