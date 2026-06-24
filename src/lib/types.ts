/* TS-типы, зеркалящие модели Go-бэкенда (backend/internal/models).
   Это копия контракта, НЕ импорт из бэкенда — проекты независимы. */

export type Role = "user" | "superadmin";
export type TournamentMode = "1x1" | "2x2";
export type TournamentStatus = "draft" | "upcoming" | "live" | "finished";
export type ParticipantKind = "player" | "team";
export type RegistrationStatus = "pending" | "accepted" | "declined";
export type ValueType = "fixed" | "percent";
export type CatalogSource = "official" | "boosty";
export type TaskKind = "pve" | "pvp" | "pvpve";
/** Тип игроков турнира — определяет пул основных заданий и контрактов. */
export type PlayerType = "pve" | "pvp" | "pvpve";

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
  playerType: PlayerType; // pve | pvp | pvpve
  status: TournamentStatus;
  totalRounds: number; // всегда 1 (один раунд = один рейд)
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
  mmr: number; // рейтинг по исходам (старт 1000, сквозной по сезонам)
  points: number; // сумма набранных баллов за сезон (вторично)
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

/** Основное задание из пула (скрыто от публики/правил; видит организатор). */
export interface StarterTask {
  id: string;
  text: string;
  points: number;
  kind: TaskKind;
}

/** Зачёт основного задания конкретной стороной. */
export interface RoundTaskDone {
  participantId: string;
  times: number;
}

/** Основное задание раунда (одинаково у обеих сторон). Зачёт раздельный по сторонам (done). */
export interface RoundStarterTask {
  id: string;
  roundId: string;
  starterTaskId: string;
  text: string;
  points: number;
  done: RoundTaskDone[];
}

/** Контракт участника в раунде. participantId — владелец; completedBy — кто выполнил
    (владелец → +2, противник → +1, пусто → не выполнен). */
export interface RoundBonusTask {
  id: string;
  roundId: string;
  roundNumber: number;
  participantId: string; // владелец контракта
  taskId: string;
  text: string;
  points: number;
  valueType: ValueType;
  kind: TaskKind;
  times: number;
  completedBy?: string | null;
}

/** Протокол стороны в раунде. times — число нарушений (= минут штрафа в рейде; на очки НЕ влияет). */
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

/** Легендарный контракт (глобальный пул, 10 баллов, выполним один раз навсегда). */
export interface CatalogLegendary {
  id: string;
  text: string;
  points: number;
  kind: TaskKind;
  source: CatalogSource;
  author?: string;
  title?: string;
  status: "available" | "done";
  completion?: LegendaryCompletion | null;
}

/** Запись о выполнении легендарного контракта (ник/дата/карта). */
export interface LegendaryCompletion {
  id: string;
  legendaryContractId: string;
  userId?: string | null;
  participantId?: string | null;
  nickname: string;
  tournamentId?: string | null;
  map?: string;
  completedAt: string;
  tournamentTitle?: string;
}

export interface LiveTask {
  id: string;
  text: string;
  points: number;
  completed: boolean;
}

/** Протокол стороны в оверлее. Штраф — минуты в рейде (на очки не влияет). */
export interface LiveComplication {
  who?: string;
  text: string;
  penalty: number;
  valueType: ValueType;
  /** Сколько раз нарушено (= минут штрафа; 0 — не нарушено). */
  times?: number;
  /** Минуты штрафа (= times). Дублируется для явности в оверлее. */
  minutes?: number;
}

/** Сторона матча в оверлее с суммарными очками (по всем раундам). */
export interface LiveStanding {
  participantId?: string;
  name: string;
  points: number;
  /** Очки за текущий раунд (для опции «счёт за раунд» в табло). */
  roundPoints?: number;
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
  /** Богатые данные для модульных виджетов (Фаза 3). */
  roundTasks?: LiveTask[]; // стартовые задания текущего раунда
  bonusTasks?: LiveBonus[]; // бонусные фокусной стороны
  complications?: LiveComplication[]; // усложнения обеих сторон
  /** Кастомизируемая раскладка модульного оверлея. Если нет — рендерится DEFAULT_LAYOUT. */
  layout?: OverlayLayout | null;
}

/** Контракт стороны в оверлее (виджет «Контракты»). */
export interface LiveBonus {
  text: string;
  points: number;
  valueType: ValueType;
  times: number; // 0 — не зачтён, >0 — зачтён (подсветка)
  who?: string; // имя стороны-владельца
  opponent?: boolean; // контракт противника фокусной стороны
}

/** Типы виджетов модульного оверлея. */
export type WidgetType =
  | "scoreboard"
  | "round"
  | "complications"
  | "standings"
  | "roundTasks"
  | "bonusTasks"
  | "text"
  | "logo";

/** Фон (вкл/выкл + прозрачность 0..1) — для виджета и для сцены целиком. */
export interface OverlayBg {
  on: boolean;
  opacity: number;
}

/** Один экземпляр виджета на сцене. Позиция/размер — ДОЛЯМИ от 1920×1080. */
export interface WidgetInstance {
  id: string;
  type: WidgetType;
  x: number; // 0..1 — левый край
  y: number; // 0..1 — верхний край
  w?: number; // 0..1 — ширина (пусто = по контенту)
  h?: number; // 0..1 — высота (пусто = по контенту)
  scale: number; // множитель размера 0.5..2
  z: number;
  visible: boolean;
  locked?: boolean;
  /** Скрыть заголовок/подпись виджета (напр. «Усложнение:», шапку списка). */
  hideTitle?: boolean;
  /** Усложнения: не показывать плашку «ШТРАФ» при нарушении (показывать как обычное усложнение). */
  hidePenalty?: boolean;
  /** Табло: показывать очки за текущий раунд в скобках рядом с основным счётом. */
  showRoundScore?: boolean;
  /** Контракты: показывать и контракты противника (что можно «украсть» за +1). */
  showOpponentContracts?: boolean;
  /** Привязка к краю (tl|tc|tr|ml|c|mr|bl|bc|br); "" — свободно. При изменении глобального отступа привязанные виджеты сдвигаются. */
  anchor?: string;
  bg: OverlayBg;
  accent?: string;
  /** Пер-типовые доп.поля (текст, url логотипа и т.п.). */
  props?: Record<string, unknown>;
}

/** Документ раскладки оверлея: виджеты + глобальные настройки сцены. */
export interface OverlayLayout {
  version: number;
  accent?: string;
  stageBg: OverlayBg;
  /** Отступ от края (px сцены) при выравнивании по краю; пусто = дефолт. */
  pad?: number;
  /** Выбранный общий пресет — хранится на сервере внутри live_state, чтобы селектор был одинаков на всех устройствах. */
  activePresetId?: string;
  widgets: WidgetInstance[];
}

/** Общий (глобальный) сохранённый пресет раскладки оверлея. */
export interface OverlayPreset {
  id: string;
  name: string;
  layout: OverlayLayout;
  createdAt: string;
  updatedAt: string;
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

/** Расширенная статистика игрока: винрейт по режимам, источники очков, любимая карта, серия. */
export interface PlayerStats {
  soloWins: number;
  soloPlayed: number;
  duoWins: number;
  duoPlayed: number;
  streakKind: "win" | "loss" | "";
  streakLen: number;
  basePoints: number; // ручная корректировка раунда
  mainPoints: number; // основные задания раунда
  contractPoints: number; // контракты (свои 2 + чужие 1)
  legendaryPoints: number; // легендарные контракты (10 каждый)
  favoriteMap: string;
  favoriteMapRounds: number;
}

/** Публичный профиль игрока: GET /api/players/{login} (B6). */
export interface PlayerProfile {
  user: User;
  mmrSolo: number; // MMR 1x1 (старт 1000)
  mmrDuo: number; // MMR 2x2 (старт 1000)
  points: number;
  wins: number;
  tournaments: number;
  stats: PlayerStats;
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

/** Ответ GET /api/leaderboard — ОБЁРНУТ в { mode, seasonId, rows }. */
export interface LeaderboardResponse {
  mode: TournamentMode;
  seasonId?: string;
  rows: LeaderboardRow[];
}

/** Сезон рейтинга (GET /api/seasons). */
export interface Season {
  id: string;
  name: string;
  status: "active" | "finished";
  startedAt: string;
  endedAt?: string | null;
  createdAt: string;
}

/** Ответ GET /api/rules — ОБЁРНУТ в { tasks (контракты), complications (протоколы), legendary }. */
export interface RulesResponse {
  tasks: CatalogTask[];
  complications: CatalogComplication[];
  legendary?: CatalogLegendary[];
}

/** GET /api/overlay/state отдаёт «голый» LiveState (или {} если не задан). */
export type OverlayState = LiveState;

/** GET /api/health. */
export interface HealthResponse {
  ok: boolean;
  overlayConns: number;
}
