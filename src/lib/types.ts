/* TS-типы, зеркалящие модели Go-бэкенда (backend/internal/models).
   Это копия контракта, НЕ импорт из бэкенда — проекты независимы. */

export type Role = "user" | "superadmin";
export type TournamentMode = "1x1" | "2x2";
export type TournamentStatus = "draft" | "upcoming" | "live" | "finished";
export type ParticipantKind = "player" | "team";
export type RegistrationStatus = "pending" | "accepted" | "declined";
export type ValueType = "fixed" | "percent";
export type CatalogSource = "official" | "boosty";
export type TaskKind = "pve" | "pvp" | "mixed";

export interface User {
  id: string;
  login: string;
  displayName: string;
  avatarUrl: string;
  role: Role;
  embarkId: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  tournamentId: string;
  kind: ParticipantKind;
  userId?: string;
  name: string;
  seed: number;
  totalPoints: number;
  members: Array<{ name: string; userId?: string }>;
}

export interface Round {
  id: string;
  tournamentId: string;
  number: number;
  map: string;
  status: string;
}

export interface Tournament {
  id: string;
  title: string;
  mode: TournamentMode;
  status: TournamentStatus;
  totalRounds: number;
  maps: string[];
  startsAt?: string | null;
  winnerParticipantId?: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount?: number;
  hasSpace?: boolean;
  participants?: Participant[];
  rounds?: Round[];
}

export interface Registration {
  id: string;
  tournamentId?: string | null; // куда поставлен; пусто — пока в пуле
  userId: string;
  embarkId: string;
  status: RegistrationStatus;
  note: string;
  createdAt: string;
  decidedAt?: string | null;
  userLogin?: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  tournamentTitle?: string;
}

export interface LeaderboardRow {
  userId: string;
  login: string;
  displayName: string;
  avatarUrl: string;
  points: number;
  wins: number;
  tournaments: number;
}

export interface CatalogTask {
  id: string;
  text: string;
  points: number;
  valueType: ValueType;
  kind: TaskKind;
  source: CatalogSource;
  author?: string;
  title?: string;
}

export interface CatalogComplication {
  id: string;
  text: string;
  penalty: number;
  valueType: ValueType;
  source: CatalogSource;
  author?: string;
  title?: string;
}

/** Стартовое задание из пула (НЕ бонусное, скрыто от публики/правил). */
export interface StarterTask {
  id: string;
  text: string;
  points: number;
  kind: TaskKind;
}

/** Стартовое задание, назначенное на раунд. times — сколько раз зачтено (баллы = times × points). */
export interface RoundStarterTask {
  id: string;
  roundId: string;
  starterTaskId: string;
  text: string;
  points: number;
  completedBy?: string | null;
  times: number;
}

/** Бонусное задание участника в раунде. times — сколько раз зачтено (0 → не выполнено, переносится). */
export interface RoundBonusTask {
  id: string;
  roundId: string;
  roundNumber: number;
  participantId: string;
  taskId: string;
  text: string;
  points: number;
  valueType: ValueType;
  times: number;
}

/** Применённое усложнение участнику в раунде. times — сколько раз (штраф = times × величина). */
export interface RoundPenalty {
  id: string;
  roundId: string;
  participantId: string;
  complicationId: string;
  text: string;
  penalty: number;
  valueType: ValueType;
  times: number;
}

export interface LiveTask {
  id: string;
  text: string;
  points: number;
  completed: boolean;
}

/** Усложнение текущего раунда в оверлее (B3). Присутствует, только если задано. */
export interface LiveComplication {
  who?: string;
  text: string;
  penalty: number;
  valueType: ValueType;
  /** Сколько раз нарушено в текущем раунде (0 — не нарушено). */
  times?: number;
}

/** Сторона матча в оверлее с суммарными очками (по всем раундам). */
export interface LiveStanding {
  participantId?: string;
  name: string;
  points: number;
}

/** Полезная нагрузка оверлея (live_state). Усложнение (B3) — опциональное поле. */
export interface LiveState {
  tournamentId?: string | null;
  tournamentName: string;
  /** Статус турнира; оверлей показывает табло только при "live". */
  status?: string;
  mode: string;
  currentRound: number;
  totalRounds: number;
  currentParticipantId?: string | null;
  currentName: string;
  currentPoints: number;
  tasks: LiveTask[];
  complication?: LiveComplication | null;
  /** Все стороны матча с суммарными очками (для VS-табло в оверлее). */
  standings?: LiveStanding[];
  showStandings?: boolean;
}

/** Одно участие игрока в турнире (профиль, B6). */
export interface PlayerHistoryItem {
  tournamentId: string;
  title: string;
  mode: string;
  status: string;
  date?: string | null;
  name: string;
  points: number;
  win: boolean;
}

/** Публичный профиль игрока: GET /api/players/{login} (B6). */
export interface PlayerProfile {
  user: User;
  points: number;
  wins: number;
  tournaments: number;
  history: PlayerHistoryItem[];
}

/** Пользователь + агрегаты участия: GET /api/users/overview (кабинет, раздел «Пользователи»). */
export interface UserOverview extends User {
  email?: string;
  tournaments: number; // завершённых турниров
  wins: number; // побед в завершённых
  points: number; // суммарные очки в завершённых
  participations: number; // всего участий (включая текущие/анонсы)
}

export type HighlightStatus = "processing" | "pending" | "approved" | "rejected" | "failed";

/** Хайлайт — пользовательский клип (твич-клип у нас или загруженный файл). GET /api/highlights. */
export interface Highlight {
  id: string;
  userId: string;
  userLogin: string;
  userName: string;
  userAvatarUrl: string;
  tournamentId?: string | null;
  tournamentTitle?: string;
  title: string;
  source: "twitch_clip" | "upload";
  sourceUrl?: string;
  videoUrl?: string; // путь относительно API-базы (api-relative), оборачивать через apiHref
  thumbUrl?: string;
  previewUrl?: string; // лёгкое превью-видео для автоплея в «стене»
  duration: number;
  status: HighlightStatus;
  rejectReason?: string;
  createdAt: string;
}

/** Ответ GET /api/leaderboard — ОБЁРНУТ в { mode, rows }. */
export interface LeaderboardResponse {
  mode: TournamentMode;
  rows: LeaderboardRow[];
}

/** Ответ GET /api/rules — ОБЁРНУТ в { tasks, complications }. */
export interface RulesResponse {
  tasks: CatalogTask[];
  complications: CatalogComplication[];
}

/** GET /api/overlay/state отдаёт «голый» LiveState (или {} если не задан). */
export type OverlayState = LiveState;

/** GET /api/health. */
export interface HealthResponse {
  ok: boolean;
  overlayConns: number;
}
