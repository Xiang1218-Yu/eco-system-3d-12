import type {
  ChallengeDef,
  ChallengeCategory,
  ChallengeMetrics,
  ChallengeEvaluation,
} from '@/types/challenge';
import type { TrophicLevel } from '@/types/ecosystem';
import { SPECIES } from '@/data/species';

/**
 * 挑战模式：把自由观察转化为可重复的实验任务。
 * 覆盖四类目标：数量(population)、营养级(trophic)、存活时间(survival)、环境结果(environment)。
 */
export const CHALLENGES: ChallengeDef[] = [
  // —— 数量类 ——
  {
    id: 'pop-bloom',
    title: '初显生机',
    description: '让生态缸中同时存在 10 个生物',
    icon: '🌱',
    category: 'population',
    metric: 'totalOrganisms',
    target: 10,
    reward: 10,
    unit: '只',
  },
  {
    id: 'pop-thriving',
    title: '繁荣群落',
    description: '维持 25 个生物同时存活',
    icon: '🐠',
    category: 'population',
    metric: 'totalOrganisms',
    target: 25,
    reward: 20,
    unit: '只',
  },
  // —— 营养级类 ——
  {
    id: 'trophic-predator',
    title: '顶级猎手',
    description: '缸中同时存在 2 只肉食动物',
    icon: '🦈',
    category: 'trophic',
    metric: 'carnivores',
    target: 2,
    reward: 15,
    unit: '只',
  },
  {
    id: 'trophic-web',
    title: '完整食物网',
    description: '让四个营养级（生产者 / 草食 / 肉食 / 分解者）同时出现',
    icon: '🕸️',
    category: 'trophic',
    metric: 'trophicLevelsPresent',
    target: 4,
    reward: 25,
    unit: '级',
  },
  // —— 存活时间类 ——
  {
    id: 'survive-elder',
    title: '生命长青',
    description: '让某个生物存活到 200 岁',
    icon: '🐢',
    category: 'survival',
    metric: 'maxAge',
    target: 200,
    reward: 20,
    unit: '岁',
  },
  {
    id: 'survive-longrun',
    title: '稳定运行',
    description: '让生态系统连续运行到 500 个模拟单位',
    icon: '⏳',
    category: 'survival',
    metric: 'simulationTime',
    target: 500,
    reward: 20,
  },
  // —— 环境结果类 ——
  {
    id: 'env-diversity',
    title: '物种多样',
    description: '缸中同时存在 6 种不同的物种',
    icon: '🦚',
    category: 'environment',
    metric: 'speciesDiversity',
    target: 6,
    reward: 20,
    unit: '种',
  },
  {
    id: 'env-balance',
    title: '生态平衡',
    description: '让生态平衡指数达到 80%',
    icon: '⚖️',
    category: 'environment',
    metric: 'balanceIndex',
    target: 80,
    reward: 25,
    unit: '%',
  },
];

export const CHALLENGE_CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  population: '数量',
  trophic: '营养级',
  survival: '存活时间',
  environment: '环境结果',
};

export const CHALLENGE_CATEGORY_COLORS: Record<ChallengeCategory, string> = {
  population: '#4ADE80',
  trophic: '#F472B6',
  survival: '#22D3EE',
  environment: '#FBBF24',
};

const SPECIES_LEVEL_MAP: Record<string, TrophicLevel> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s.trophicLevel]),
);

export function getChallengeById(id: string): ChallengeDef | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

/**
 * 由当前生态缸状态计算挑战所需指标。
 * balanceIndex 由外部传入（复用 store 的 getStats），其余指标在此推导。
 */
export function computeChallengeMetrics(
  speciesIds: string[],
  ages: number[],
  simulationTime: number,
  balanceIndex: number,
): ChallengeMetrics {
  const levelCounts: Record<TrophicLevel, number> = {
    producer: 0,
    herbivore: 0,
    carnivore: 0,
    decomposer: 0,
  };

  for (const spId of speciesIds) {
    const level = SPECIES_LEVEL_MAP[spId];
    if (level) levelCounts[level] += 1;
  }

  const trophicLevelsPresent = Object.values(levelCounts).filter((n) => n > 0).length;

  return {
    totalOrganisms: speciesIds.length,
    producers: levelCounts.producer,
    herbivores: levelCounts.herbivore,
    carnivores: levelCounts.carnivore,
    decomposers: levelCounts.decomposer,
    trophicLevelsPresent,
    speciesDiversity: new Set(speciesIds).size,
    maxAge: ages.length ? Math.max(...ages) : 0,
    simulationTime,
    balanceIndex,
  };
}

/** 评估单个挑战在当前指标下的进度 */
export function evaluateChallenge(def: ChallengeDef, metrics: ChallengeMetrics): ChallengeEvaluation {
  const current = metrics[def.metric] ?? 0;
  const fraction = def.target > 0 ? Math.min(1, current / def.target) : 0;
  return {
    current,
    target: def.target,
    fraction,
    completed: current >= def.target,
  };
}
