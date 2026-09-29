import assert from 'node:assert';
import {
  buildSnapshot,
  checkChallenges,
  getChallengeProgress,
} from '../src/utils/challengeEngine.ts';
import { CHALLENGES } from '../src/data/challenges.ts';
import type { Organism } from '../src/types/ecosystem.ts';

function makeOrganisms(spec: Array<[string, number]>): Organism[] {
  const out: Organism[] = [];
  for (const [speciesId, n] of spec) {
    for (let i = 0; i < n; i++) {
      out.push({
        id: `${speciesId}-${i}-${Math.random()}`,
        speciesId,
        position: { x: 0, y: 0, z: 0 } as never,
        velocity: { x: 0, y: 0, z: 0 } as never,
        energy: 50,
        age: 0,
        state: 'idle',
        targetId: null,
        rotation: 0,
        scale: 1,
      });
    }
  }
  return out;
}

// 理想比例: producer 50% herb 30% carn 10% decomp 10% → balanceIndex=100
const balanced = makeOrganisms([
  ['seaweed', 5],
  ['grass', 5],
  ['fish', 4],
  ['snail', 2],
  ['bigfish', 1],
  ['frog', 1],
  ['bacteria', 2],
]);

let streaks: Record<string, number> = {};
let completions: Record<string, number> = {};
let totalRewards = 0;

// —— Tick 1：20 只生物，四个营养级齐全，balance≈100 ——
const snap1 = buildSnapshot(balanced);
assert.strictEqual(snap1.totalOrganisms, 20, 'total 20');
assert.strictEqual(snap1.presentLevels, 4, '4 levels present');
assert.strictEqual(snap1.presentSpecies, 7, '7 species');
assert.ok(snap1.balanceIndex >= 99, `balance should be ~100, got ${snap1.balanceIndex}`);

let r = checkChallenges({ snapshot: snap1, streaks, completions });
const completedIds = new Set(r.newlyCompleted.map((c) => c.id));
// 瞬时类应首次完成: first-life, bustling-aquarium, fish-school(4<8 no),
// species-richness(7>=5), complete-foodweb, apex-predator(2<3 no), balanced-ecosystem
assert.ok(completedIds.has('first-life'), 'first-life completes');
assert.ok(completedIds.has('bustling-aquarium'), 'bustling-aquarium completes');
assert.ok(!completedIds.has('fish-school'), 'fish-school not yet (4 fish)');
assert.ok(completedIds.has('species-richness'), 'species-richness completes');
assert.ok(completedIds.has('complete-foodweb'), 'complete-foodweb completes');
assert.ok(!completedIds.has('apex-predator'), 'apex-predator not yet (2 carnivores)');
assert.ok(completedIds.has('balanced-ecosystem'), 'balanced-ecosystem completes');
assert.ok(!completedIds.has('survivor-300'), 'survivor needs streak');
assert.ok(!completedIds.has('harmony-200'), 'harmony needs streak');
// 持续类 streak 累加
assert.strictEqual(r.streaks['survivor-300'], 1);
assert.strictEqual(r.streaks['harmony-200'], 1);
const firstTickReward = r.newlyCompleted.reduce((s, c) => s + c.reward, 0);
assert.strictEqual(r.rewardsEarned, firstTickReward);
streaks = r.streaks;
completions = r.completions;
totalRewards += r.rewardsEarned;

// —— Tick 2：相同条件 —— 已完成的不重复出现，不重复发奖 ——
r = checkChallenges({ snapshot: snap1, streaks, completions });
assert.strictEqual(r.newlyCompleted.length, 0, 'no re-completion');
assert.strictEqual(r.rewardsEarned, 0, 'no duplicate reward');
assert.strictEqual(r.streaks['survivor-300'], 2);
assert.strictEqual(r.streaks['harmony-200'], 2);
streaks = r.streaks;
completions = r.completions;

// —— 中断：只剩生产者，streak 应归零 ——
const producersOnly = makeOrganisms([['seaweed', 3]]);
const snapBroken = buildSnapshot(producersOnly);
r = checkChallenges({ snapshot: snapBroken, streaks, completions });
assert.strictEqual(r.streaks['survivor-300'], 0, 'survivor streak resets');
assert.strictEqual(r.streaks['harmony-200'], 0, 'harmony streak resets');
assert.strictEqual(r.rewardsEarned, 0);
streaks = r.streaks;
completions = r.completions;

// —— 重新满足并维持 300 tick → survivor-300 完成；200 tick → harmony 完成 ——
for (let t = 0; t < 300; t++) {
  r = checkChallenges({ snapshot: snap1, streaks, completions });
  streaks = r.streaks;
  completions = r.completions;
  if (t === 199) {
    assert.ok(r.newlyCompleted.some((c) => c.id === 'harmony-200'), 'harmony completes at 200');
  } else if (t === 299) {
    assert.ok(r.newlyCompleted.some((c) => c.id === 'survivor-300'), 'survivor completes at 300');
  } else {
    assert.strictEqual(r.newlyCompleted.length, 0);
  }
}
assert.ok(completions['harmony-200'], 'harmony recorded');
assert.ok(completions['survivor-300'], 'survivor recorded');

// 完成后再跑 100 tick 也不会重复发奖
let extraRewards = 0;
for (let t = 0; t < 100; t++) {
  r = checkChallenges({ snapshot: snap1, streaks, completions });
  streaks = r.streaks;
  completions = r.completions;
  extraRewards += r.rewardsEarned;
}
assert.strictEqual(extraRewards, 0, 'no rewards after all complete');

// —— fish-school / apex-predator 进度条 ——
const prog = getChallengeProgress(
  CHALLENGES.find((c) => c.id === 'fish-school')!,
  snap1,
  0,
);
assert.strictEqual(prog.current, 4);
assert.strictEqual(prog.denominator, 8);
assert.ok(Math.abs(prog.ratio - 0.5) < 1e-9);
assert.strictEqual(prog.conditionMet, false);

const carnProg = getChallengeProgress(
  CHALLENGES.find((c) => c.id === 'apex-predator')!,
  snap1,
  0,
);
assert.strictEqual(carnProg.current, 2);

// —— 8 只小鱼达成 ——
const manyFish = makeOrganisms([['fish', 8]]);
const snapFish = buildSnapshot(manyFish);
r = checkChallenges({ snapshot: snapFish, streaks: {}, completions: {} });
assert.ok(r.newlyCompleted.some((c) => c.id === 'fish-school'), 'fish-school completes at 8');
assert.ok(r.newlyCompleted.some((c) => c.id === 'first-life'));
assert.strictEqual(r.completions['fish-school']! > 0, true);

// —— 空缸 ——
const empty = buildSnapshot([]);
assert.strictEqual(empty.balanceIndex, 0);
assert.strictEqual(empty.totalOrganisms, 0);
r = checkChallenges({ snapshot: empty, streaks: {}, completions: {} });
assert.strictEqual(r.newlyCompleted.length, 0, 'nothing completes in empty tank');

console.log('✅ all challenge engine tests passed');
