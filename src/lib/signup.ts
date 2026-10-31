/* Регистрация: правила полей и тексты - общие для обоих дизайнов. Проверка дублирует бэкенд,
   чтобы ошибку видно сразу; решает всё равно сервер. */

export const NICK_MIN = 3;
export const NICK_MAX = 12;

const LOGIN_RE = /^[A-Za-z0-9_]{3,32}$/;
const NICK_RE = /^\p{L}[\p{L}0-9]*$/u;
const EMBARK_RE = /^[^#]+#\d{4}$/;
const MIN_PASSWORD = 8;
// Лимит bcrypt - 72 байта (для не-ASCII символ может быть больше байта).
const MAX_PASSWORD_BYTES = 72;

/** Требования к нику - показываются под полем. */
export const NICK_RULES = [
  "Длина: от 3 до 12 символов.",
  "Допустимые символы: буквы (в том числе с диакритическими знаками) и цифры.",
  "Ник не может начинаться с цифры.",
  "Регистр любой: можно смешивать прописные и строчные (например, ZeRgRuSh).",
  "Нельзя пробелы, знаки препинания и любые спецсимволы.",
  "Ник не должен содержать оскорблений, ненормативной лексики, разжигания ненависти или защищённых товарных знаков. За нарушение имя принудительно сбросят.",
];

/** Крупный текст на странице регистрации: у играющих ранее профиль уже заведён. */
export const REGISTER_EXISTING_PROFILE_TEXT =
  "Если ты участвовал в лиге ранее, твой профиль уже создан. Чтобы получить к нему доступ, напиши в дискорд в чат «профиль на сайте».";

export interface SignupFields {
  login: string;
  password: string;
  nick: string;
  embarkId: string;
}

/** Возвращает текст первой ошибки или пустую строку, если поля в порядке. */
export function validateSignup(f: SignupFields): string {
  if (!LOGIN_RE.test(f.login.trim())) return "Логин: 3–32 символа, латиница, цифры и подчёркивание.";
  if (f.password.length < MIN_PASSWORD) return "Пароль должен быть не короче 8 символов.";
  if (new TextEncoder().encode(f.password).length > MAX_PASSWORD_BYTES) return "Пароль слишком длинный (не более 72 байт).";
  if (f.password.trim().toLowerCase() === f.login.trim().toLowerCase()) return "Пароль не должен совпадать с логином.";
  const nickLen = [...f.nick.trim()].length;
  if (nickLen < NICK_MIN || nickLen > NICK_MAX) return "Ник: от 3 до 12 символов.";
  if (!NICK_RE.test(f.nick.trim())) return "Ник: только буквы и цифры, без пробелов и знаков, не начинается с цифры.";
  if (!EMBARK_RE.test(f.embarkId.trim())) return "Embark ID в формате Ник#1234 (ник, решётка и ровно 4 цифры).";
  return "";
}
