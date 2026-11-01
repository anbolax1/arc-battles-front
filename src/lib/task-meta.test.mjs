// Запуск: npm test. Проверяет фильтры списка заданий и баллы по умолчанию.
import test from "node:test";
import assert from "node:assert/strict";
import { defaultPoints, matchesFilter, parsePoints, rarityMeta, RARITIES, withTimed, defaultSettings } from "./task-meta.ts";

const base = { category: "task", format: "all", kind: "all", rarity: "all", timed: "all", roundType: "all", map: "all", source: "all", showOff: false, query: "" };
const task = (over) => ({
  id: "1", text: "Описание", name: "Имя", points: 2, valueType: "fixed", kind: "pvp", source: "official", category: "task",
  tag: "normal", mapCodes: [], active: true, format: "2x2", rarity: "epic", roundType: "paid", ...over,
});

test("фильтры комбинируются: 2×2 + PvP + Эпический + Платный раунд", () => {
  const f = { ...base, format: "2x2", kind: "pvp", rarity: "epic", roundType: "paid" };
  assert.ok(matchesFilter(task({}), f));
  assert.ok(!matchesFilter(task({ format: "1x1" }), f));
  assert.ok(!matchesFilter(task({ kind: "pve" }), f));
  assert.ok(!matchesFilter(task({ rarity: "rare" }), f));
  assert.ok(!matchesFilter(task({ roundType: "free" }), f));
  assert.ok(!matchesFilter(task({ roundType: "any" }), f));
});

test("«На время» независимо от редкости", () => {
  for (const r of RARITIES) {
    assert.ok(matchesFilter(task({ rarity: r.id, tag: "timed" }), { ...base, rarity: r.id, timed: "timed" }));
    assert.ok(!matchesFilter(task({ rarity: r.id, tag: "normal" }), { ...base, rarity: r.id, timed: "timed" }));
    assert.ok(matchesFilter(task({ rarity: r.id, tag: "normal" }), { ...base, rarity: r.id, timed: "normal" }));
  }
});

test("старое задание без новых полей: формат «оба», редкость «обычный», раунд «любой»", () => {
  const old = task({ format: undefined, rarity: undefined, roundType: undefined });
  assert.ok(matchesFilter(old, { ...base, format: "any", rarity: "common", roundType: "any" }));
  assert.ok(!matchesFilter(old, { ...base, format: "1x1" }));
  assert.equal(rarityMeta("неизвестная").id, "common");
  assert.ok(matchesFilter(task({ rarity: "mythic" }), { ...base, rarity: "common" }));
});

test("карта, источник, поиск, выключенные", () => {
  assert.ok(matchesFilter(task({ mapCodes: ["a", "b"] }), { ...base, map: "b" }));
  assert.ok(!matchesFilter(task({ mapCodes: ["a"] }), { ...base, map: "universal" }));
  assert.ok(matchesFilter(task({}), { ...base, map: "universal" }));
  assert.ok(!matchesFilter(task({ source: "boosty" }), { ...base, source: "official" }));
  assert.ok(matchesFilter(task({ name: "Голыми руками" }), { ...base, query: "голыми" }));
  assert.ok(!matchesFilter(task({ active: false }), base));
  assert.ok(matchesFilter(task({ active: false }), { ...base, showOff: true }));
});

test("протокол не режется фильтрами пула и карты", () => {
  const p = task({ category: "protocol", kind: "pvpve", tag: "timed" });
  assert.ok(matchesFilter(p, { ...base, category: "protocol", kind: "pve", map: "x" }));
});

test("баллы по умолчанию не зависят от редкости", () => {
  assert.equal(defaultPoints("task", false), 2);
  assert.equal(defaultPoints("task", true), 1);
  assert.equal(defaultPoints("protocol", false), 1);
  for (const r of RARITIES) assert.equal(defaultSettings("task", { rarity: r.id }).points, "2");
  const s = defaultSettings("task");
  assert.equal(withTimed(s, "task", true).points, "1");
  assert.equal(withTimed({ ...s, points: "5", pointsTouched: true }, "task", true).points, "5");
  assert.equal(parsePoints("0"), null);
  assert.equal(parsePoints("10"), 10);
  assert.equal(parsePoints("11"), null);
  assert.equal(parsePoints("2.5"), null);
});
