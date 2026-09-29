import type { Challenge } from '@/types/challenge';

/**
 * 挑战模式：把自由观察变成可重复的实验任务。
 * 至少六个围绕数量、营养级、存活时间或环境结果的挑战（此处定义九个）。
 */
export const CHALLENGES: Challenge[] = [
  // —— 数量类 ——
  {
    id: 'first-life',
    title: '初次造物',
    description: '在生态缸中投放任意生物，开启你的实验。',
    icon: '🌱',
    category: 'quantity',
    categoryLabel: '数量',
    metric: { kind: 'totalPopulation' },
    target: 1,
    reward: 10,
  },
  {
    id: 'bustling-aquarium',
    title: '热闹生态缸',
    description: '让缸内生物总数同时达到 20 只。',
    icon: '🐟',
    category: 'quantity',
    categoryLabel: '数量',
    metric: { kind: 'totalPopulation' },
    target: 20,
    reward: 30,
  },
  {
    id: 'fish-school',
    title: '小鱼成群',
    description: '让小鱼种群数量同时达到 8 只。',
    icon: '🐠',
    category: 'quantity',
    categoryLabel: '数量',
    metric: { kind: 'speciesPopulation', speciesId: 'fish' },
    target: 8,
    reward: 25,
  },
  // —— 营养级类 ——
  {
    id: 'species-richness',
    title: '物种多样',
    description: '让 5 种不同物种在缸内同时共存。',
    icon: '🧬',
    category: 'trophic',
    categoryLabel: '营养级',
    metric: { kind: 'presentSpecies' },
    target: 5,
    reward: 35,
  },
  {
    id: 'complete-foodweb',
    title: '完整食物网',
    description: '让生产者、草食动物、肉食动物、分解者四个营养级同时在场。',
    icon: '🔗',
    category: 'trophic',
    categoryLabel: '营养级',
    metric: { kind: 'trophicLevelsPresent' },
    target: 4,
    reward: 50,
  },
  {
    id: 'apex-predator',
    title: '顶级猎手',
    description: '让肉食动物（大鱼或青蛙）数量同时达到 3 只。',
    icon: '🦈',
    category: 'trophic',
    categoryLabel: '营养级',
    metric: { kind: 'trophicLevelCount', level: 'carnivore' },
    target: 3,
    reward: 40,
  },
  // —— 存活时间类 ——
  {
    id: 'survivor-300',
    title: '坚韧生存者',
    description: '四个营养级齐全的状态下，维持生态系统稳定运行 300 个时间单位。',
    icon: '⏳',
    category: 'survival',
    categoryLabel: '存活时间',
    metric: { kind: 'trophicLevelsPresent' },
    target: 4,
    duration: 300,
    reward: 60,
  },
  // —— 环境结果类 ——
  {
    id: 'balanced-ecosystem',
    title: '生态平衡',
    description: '让生态平衡指数达到 80%。',
    icon: '⚖️',
    category: 'environment',
    categoryLabel: '环境',
    metric: { kind: 'balanceIndex' },
    target: 80,
    reward: 45,
  },
  {
    id: 'harmony-200',
    title: '和谐共生',
    description: '维持生态平衡指数 80% 以上达 200 个时间单位。',
    icon: '🌊',
    category: 'environment',
    categoryLabel: '环境',
    metric: { kind: 'balanceIndex' },
    target: 80,
    duration: 200,
    reward: 80,
  },
];

export const CHALLENGE_MAP: Record<string, Challenge> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c]),
);

export function getChallengeById(id: string): Challenge | undefined {
  return CHALLENGE_MAP[id];
}
