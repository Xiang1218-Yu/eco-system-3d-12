import assert from 'node:assert';

// localStorage / window shim（zustand persist 在 Node 环境下需要）
const mem = new Map<string, string>();
const localStorageShim = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  length: 0,
};
globalThis.localStorage = localStorageShim as unknown as Storage;
(globalThis as Record<string, unknown>).window = { localStorage: localStorageShim };

const { useEcosystemStore } = await import('../src/store/useEcosystemStore.ts');

// 投放 20 只生物（4 个营养级、理想比例）
const balanced: Array<[string, number]> = [
  ['seaweed', 5],
  ['grass', 5],
  ['fish', 4],
  ['snail', 2],
  ['bigfish', 1],
  ['frog', 1],
  ['bacteria', 2],
];
for (const [speciesId, n] of balanced) {
  for (let i = 0; i < n; i++) useEcosystemStore.getState().addOrganism(speciesId);
}
assert.strictEqual(useEcosystemStore.getState().organisms.length, 20);

// Tick 1：首次完成一批挑战
useEcosystemStore.getState().checkChallengeConditions();
let s = useEcosystemStore.getState();
const firstQueue = s.achievementQueue.map((q) => q.challengeId);
assert.ok(firstQueue.includes('first-life'));
assert.ok(firstQueue.includes('balanced-ecosystem'));
assert.ok(firstQueue.includes('complete-foodweb'));
assert.ok(!firstQueue.includes('survivor-300'));
const pointsAfterFirst = s.researchPoints;
assert.ok(pointsAfterFirst > 0, 'rewards granted on first completion');

// Tick 2：队列保留（等动画 dismiss），不新增重复项、不重复加奖励
useEcosystemStore.getState().checkChallengeConditions();
s = useEcosystemStore.getState();
assert.deepStrictEqual(
  s.achievementQueue.map((q) => q.challengeId),
  firstQueue,
  'no duplicate achievement entries',
);
assert.strictEqual(s.researchPoints, pointsAfterFirst, 'no duplicate rewards');

// 出队全部
[...s.achievementQueue].forEach((q) => useEcosystemStore.getState().dismissAchievement(q.id));
assert.strictEqual(useEcosystemStore.getState().achievementQueue.length, 0);

// 再跑很多 tick，已完成挑战不再发奖
for (let t = 0; t < 50; t++) useEcosystemStore.getState().checkChallengeConditions();
s = useEcosystemStore.getState();
assert.strictEqual(s.researchPoints, pointsAfterFirst);
assert.strictEqual(s.achievementQueue.length, 0);

// 持久化内容检查：只存了 completions 和 researchPoints
const persisted = JSON.parse(mem.get('ecosystem-challenge-progress')!);
assert.ok(persisted.state.challengeCompletions['first-life'], 'completion persisted');
assert.strictEqual(persisted.state.researchPoints, pointsAfterFirst);
assert.strictEqual(persisted.state.organisms, undefined, 'organisms not persisted');
assert.strictEqual(persisted.state.achievementQueue, undefined, 'queue not persisted');

// 清空生物 → survivor streak 中断归零
useEcosystemStore.setState({ organisms: [] });
useEcosystemStore.getState().checkChallengeConditions();
assert.strictEqual(useEcosystemStore.getState().challengeStreaks['survivor-300'], 0);

// 重新满足并维持 300 tick
for (const [speciesId, n] of balanced) {
  for (let i = 0; i < n; i++) useEcosystemStore.getState().addOrganism(speciesId);
}
for (let t = 0; t < 300; t++) useEcosystemStore.getState().checkChallengeConditions();
s = useEcosystemStore.getState();
assert.ok(s.challengeCompletions['survivor-300'], 'survivor recorded');
assert.ok(s.achievementQueue.some((q) => q.challengeId === 'survivor-300'), 'survivor animation queued once');
assert.ok(s.researchPoints > pointsAfterFirst, 'survivor reward added once');

// 再跑 300 tick，survivor 不会重复
const pointsNow = s.researchPoints;
for (let t = 0; t < 300; t++) useEcosystemStore.getState().checkChallengeConditions();
s = useEcosystemStore.getState();
const survivorQueueCount = s.achievementQueue.filter((q) => q.challengeId === 'survivor-300').length;
assert.strictEqual(survivorQueueCount, 1, 'achievement anim only once');
assert.strictEqual(s.researchPoints, pointsNow, 'no repeat reward');

console.log('✅ store integration tests passed; points =', s.researchPoints);
