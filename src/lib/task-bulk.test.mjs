// Запуск: npm test (node --test). Файл .mjs, чтобы его не проверял tsc.
import test from "node:test";
import assert from "node:assert/strict";
import { parseBulk, replaceRecord, removeRecord, splitRecords, taskKey } from "./task-bulk.ts";

const ok = (rows) => rows.filter((r) => !r.problem).map((r) => [r.name, r.text]);

test("формат Название:Описание: разделитель - только первое двоеточие", () => {
  const rows = parseBulk("Уничтожить 3 ARC:Уничтожьте три единицы ARC за рейд.\nВремя: 10:30 - выжить:до конца");
  assert.deepEqual(ok(rows), [
    ["Уничтожить 3 ARC", "Уничтожьте три единицы ARC за рейд."],
    ["Время", "10:30 - выжить:до конца"],
  ]);
});

test("формат Название | Описание сохранён, остальные вертикальные черты остаются в описании", () => {
  const rows = parseBulk("Голыми руками | Убейте рейдера | без оружия\n«Найти реликвию» | Найдите любую реликвию");
  assert.deepEqual(ok(rows), [
    ["Голыми руками", "Убейте рейдера | без оружия"],
    ["Найти реликвию", "Найдите любую реликвию"],
  ]);
});

test("две колонки из Excel / Google Sheets (табуляция)", () => {
  const rows = parseBulk('Выжить\tЗавершите рейд без нокаута\nБочка\t"Уничтожьте ""взрывную"" бочку"\tлишняя колонка');
  assert.deepEqual(ok(rows), [
    ["Выжить", "Завершите рейд без нокаута"],
    ["Бочка", 'Уничтожьте "взрывную" бочку лишняя колонка'],
  ]);
});

test("ячейка таблицы с переносом строки остаётся одним заданием", () => {
  const raw = 'Выжить\t"Завершите рейд\nбез нокаута"\nБочка\tВзорвите бочку';
  const rows = parseBulk(raw);
  assert.equal(rows.length, 2);
  assert.deepEqual(ok(rows), [
    ["Выжить", "Завершите рейд без нокаута"],
    ["Бочка", "Взорвите бочку"],
  ]);
});

test("пустые строки и лишние пробелы, CRLF", () => {
  const rows = parseBulk("\r\n  Выжить  :   Завершите    рейд \r\n\r\n   \r\nБочка|Взорвать\r\n");
  assert.deepEqual(ok(rows), [
    ["Выжить", "Завершите рейд"],
    ["Бочка", "Взорвать"],
  ]);
  assert.equal(rows.length, 2);
});

test("пустое название, пустое описание и строка без разделителя - проблемы, а не задания", () => {
  const rows = parseBulk(":Только описание\nТолько название:\nПросто фраза\n | пусто\nНорма:Описание");
  assert.deepEqual(
    rows.map((r) => r.problem),
    ["empty-name", "empty-text", "no-separator", "empty-name", undefined],
  );
  assert.deepEqual(ok(rows), [["Норма", "Описание"]]);
});

test("повторы внутри списка и в каталоге", () => {
  const existing = new Set([taskKey("Бочка", "Взорвать")]);
  const raw = "Выжить:Рейд\nвыжить :  рейд\nБочка:Взорвать";
  assert.deepEqual(
    parseBulk(raw).map((r) => r.problem),
    [undefined, "duplicate", undefined],
  );
  const withCatalog = parseBulk(raw, existing);
  assert.deepEqual(
    withCatalog.map((r) => r.problem),
    [undefined, "duplicate", "exists"],
  );
  assert.equal(withCatalog[1].duplicateOf, 1);
});

test("20 заданий разом", () => {
  const raw = Array.from({ length: 20 }, (_, i) => `Задание ${i + 1}:Описание ${i + 1}`).join("\n");
  const rows = parseBulk(raw);
  assert.equal(rows.length, 20);
  assert.equal(ok(rows).length, 20);
});

test("правка и удаление строки не трогают остальной список", () => {
  const raw = "Первое:Раз\nПросто фраза\nТретье:Три";
  const rows = parseBulk(raw);
  const fixed = replaceRecord(raw, rows[1].record, "Второе", "Два");
  assert.equal(fixed, "Первое:Раз\nВторое | Два\nТретье:Три");
  assert.equal(parseBulk(fixed).filter((r) => r.problem).length, 0);
  assert.equal(removeRecord(raw, rows[1].record), "Первое:Раз\nТретье:Три");
  assert.equal(removeRecord("Единственное:Задание", parseBulk("Единственное:Задание")[0].record), "");
});

test("splitRecords: смещения записей совпадают с исходным текстом", () => {
  const raw = "a:b\n\n  c:d  \n";
  const recs = splitRecords(raw);
  assert.deepEqual(
    recs.map((r) => raw.slice(r.start, r.end)),
    ["a:b", "  c:d  "],
  );
});
