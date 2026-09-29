import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as THREE from 'three';
import type { Organism, EcosystemStats, Species } from '@/types/ecosystem';
import type {
  AchievementQueueItem,
  ChallengeCompletions,
} from '@/types/challenge';
import { getSpeciesById, SPECIES } from '@/data/species';
import { buildSnapshot, checkChallenges } from '@/utils/challengeEngine';

interface EcosystemStore {
  organisms: Organism[];
  selectedSpeciesId: string | null;
  selectedOrganismId: string | null;
  isRunning: boolean;
  simulationTime: number;
  showLabels: boolean;

  // —— 挑战模式 ——
  /** 持续类挑战已连续满足条件的 tick 数（不持久化，属于运行态） */
  challengeStreaks: Record<string, number>;
  /** 挑战完成记录：challengeId -> 完成时间戳（持久化） */
  challengeCompletions: ChallengeCompletions;
  /** 累计科研点，首次完成挑战发放（持久化） */
  researchPoints: number;
  /** 等待播放成就动画的队列 */
  achievementQueue: AchievementQueueItem[];

  addOrganism: (speciesId: string, position?: THREE.Vector3) => void;
  removeOrganism: (organismId: string) => void;
  updateOrganism: (organismId: string, updates: Partial<Organism>) => void;
  setSelectedSpecies: (speciesId: string | null) => void;
  setSelectedOrganism: (organismId: string | null) => void;
  toggleSimulation: () => void;
  incrementTime: () => void;
  resetEcosystem: () => void;
  toggleLabels: () => void;
  getStats: () => EcosystemStats;
  batchUpdateOrganisms: (updates: { id: string; updates: Partial<Organism> }[]) => void;
  batchRemoveOrganisms: (ids: string[]) => void;

  /** 运行中持续检查挑战条件，首次完成时记录并发奖、入队成就动画 */
  checkChallengeConditions: () => void;
  /** 成就动画播放结束后移出队列 */
  dismissAchievement: (queueId: string) => void;
}

const AQUARIUM_BOUNDS = {
  minX: -4,
  maxX: 4,
  minY: -2,
  maxY: 2,
  minZ: -2,
  maxZ: 2,
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function randomPosition(species: Species): THREE.Vector3 {
  const isProducer = species.trophicLevel === 'producer';
  const minY = isProducer ? AQUARIUM_BOUNDS.minY : AQUARIUM_BOUNDS.minY + 0.3;
  const maxY = isProducer ? AQUARIUM_BOUNDS.minY + 0.5 : AQUARIUM_BOUNDS.maxY - 0.3;

  return new THREE.Vector3(
    AQUARIUM_BOUNDS.minX + Math.random() * (AQUARIUM_BOUNDS.maxX - AQUARIUM_BOUNDS.minX),
    minY + Math.random() * (maxY - minY),
    AQUARIUM_BOUNDS.minZ + Math.random() * (AQUARIUM_BOUNDS.maxZ - AQUARIUM_BOUNDS.minZ),
  );
}

function createOrganism(speciesId: string, position?: THREE.Vector3): Organism | null {
  const species = getSpeciesById(speciesId);
  if (!species) return null;

  const pos = position || randomPosition(species);

  return {
    id: generateId(),
    speciesId,
    position: pos,
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * species.speed,
      (Math.random() - 0.5) * species.speed * 0.5,
      (Math.random() - 0.5) * species.speed,
    ),
    energy: species.energyValue * (0.7 + Math.random() * 0.3),
    age: Math.random() * species.lifespan * 0.3,
    state: 'idle',
    targetId: null,
    rotation: Math.random() * Math.PI * 2,
    scale: 0.8 + Math.random() * 0.4,
  };
}

export const useEcosystemStore = create<EcosystemStore>()(
  persist(
    (set, get) => ({
      organisms: [],
      selectedSpeciesId: null,
      selectedOrganismId: null,
      isRunning: true,
      simulationTime: 0,
      showLabels: true,

      // —— 挑战模式 ——
      challengeStreaks: {},
      challengeCompletions: {},
      researchPoints: 0,
      achievementQueue: [],

      addOrganism: (speciesId, position) => {
    const state = get();
    const species = getSpeciesById(speciesId);
    if (!species) return;

    const currentCount = state.organisms.filter((o) => o.speciesId === speciesId).length;
    if (currentCount >= species.maxPopulation) return;

    const organism = createOrganism(speciesId, position);
    if (organism) {
      set((prev) => ({ organisms: [...prev.organisms, organism] }));
    }
  },

  removeOrganism: (organismId) => {
    set((prev) => ({
      organisms: prev.organisms.filter((o) => o.id !== organismId),
      selectedOrganismId: prev.selectedOrganismId === organismId ? null : prev.selectedOrganismId,
    }));
  },

  updateOrganism: (organismId, updates) => {
    set((prev) => ({
      organisms: prev.organisms.map((o) => (o.id === organismId ? { ...o, ...updates } : o)),
    }));
  },

  batchUpdateOrganisms: (updates) => {
    set((prev) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.updates]));
      return {
        organisms: prev.organisms.map((o) => {
          const update = updateMap.get(o.id);
          return update ? { ...o, ...update } : o;
        }),
      };
    });
  },

  batchRemoveOrganisms: (ids) => {
    const idSet = new Set(ids);
    set((prev) => ({
      organisms: prev.organisms.filter((o) => !idSet.has(o.id)),
      selectedOrganismId:
        prev.selectedOrganismId && idSet.has(prev.selectedOrganismId) ? null : prev.selectedOrganismId,
    }));
  },

  setSelectedSpecies: (speciesId) => {
    set({ selectedSpeciesId: speciesId });
  },

  setSelectedOrganism: (organismId) => {
    set({ selectedOrganismId: organismId });
  },

  toggleSimulation: () => {
    set((prev) => ({ isRunning: !prev.isRunning }));
  },

  incrementTime: () => {
    set((prev) => ({ simulationTime: prev.simulationTime + 1 }));
  },

  resetEcosystem: () => {
    set({
      organisms: [],
      selectedSpeciesId: null,
      selectedOrganismId: null,
      simulationTime: 0,
      isRunning: true,
    });
  },

  toggleLabels: () => {
    set((prev) => ({ showLabels: !prev.showLabels }));
  },

  getStats: () => {
    const state = get();
    const populationBySpecies: Record<string, number> = {};
    SPECIES.forEach((s) => {
      populationBySpecies[s.id] = 0;
    });
    state.organisms.forEach((o) => {
      populationBySpecies[o.speciesId] = (populationBySpecies[o.speciesId] || 0) + 1;
    });

    let balanceIndex = 0;
    const levels = ['producer', 'herbivore', 'carnivore', 'decomposer'];
    const levelCounts: Record<string, number> = { producer: 0, herbivore: 0, carnivore: 0, decomposer: 0 };
    state.organisms.forEach((o) => {
      const sp = getSpeciesById(o.speciesId);
      if (sp) levelCounts[sp.trophicLevel]++;
    });

    const total = state.organisms.length;
    if (total > 0) {
      const idealRatios = { producer: 0.5, herbivore: 0.3, carnivore: 0.1, decomposer: 0.1 };
      let deviation = 0;
      levels.forEach((level) => {
        const actual = levelCounts[level] / total;
        deviation += Math.abs(actual - idealRatios[level]);
      });
      balanceIndex = Math.max(0, 100 - deviation * 100);
    }

    return {
      time: state.simulationTime,
      isRunning: state.isRunning,
      balanceIndex,
      populationBySpecies,
      totalOrganisms: total,
    };
  },

  checkChallengeConditions: () => {
    const state = get();
    const snapshot = {
      ...buildSnapshot(state.organisms),
      simulationTime: state.simulationTime,
    };

    const result = checkChallenges({
      snapshot,
      streaks: state.challengeStreaks,
      completions: state.challengeCompletions,
    });

    // 首次完成才入队播放成就动画、发放奖励；已完成的挑战不会再出现
    if (result.newlyCompleted.length > 0) {
      const newItems: AchievementQueueItem[] = result.newlyCompleted.map((c) => ({
        id: generateId(),
        challengeId: c.id,
      }));
      set({
        challengeStreaks: result.streaks,
        challengeCompletions: result.completions,
        researchPoints: state.researchPoints + result.rewardsEarned,
        achievementQueue: [...state.achievementQueue, ...newItems],
      });
    } else if (result.streaks !== state.challengeStreaks) {
      set({ challengeStreaks: result.streaks });
    }
  },

  dismissAchievement: (queueId) => {
    set((prev) => ({
      achievementQueue: prev.achievementQueue.filter((item) => item.id !== queueId),
    }));
  },
    }),
    {
      name: 'ecosystem-challenge-progress',
      // 仅持久化挑战完成记录与科研点；运行态（队列/streak/生物）不持久化
      partialize: (state) => ({
        challengeCompletions: state.challengeCompletions,
        researchPoints: state.researchPoints,
      }),
    },
  ),
);

export { AQUARIUM_BOUNDS };
