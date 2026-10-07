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
  /** Теги, тег роли первым. На сайте приходят только видимые, в кабинете - все. */
  tags?: UserTag[];
}

/** Тег игрока; visible - организатор показывает его на сайте, hiddenByUser - игрок сам убрал его из профиля. */
export interface UserTag {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  hiddenByUser?: boolean;
}

export interface TagHolder {
  userId: string;
  login: string;
  displayName: string;
}

/** Тег в кабинете вместе с теми, кому он выдан. Тег с ролью есть у всех с этой ролью и выше,
    тег с сезоном выдаётся сам победителю сезона. */
export interface Tag extends UserTag {
  role?: Role;
  seasonId?: string;
  seasonName?: string;
  holderCount: number;
  holders: TagHolder[];
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
  mapCode?: string;
  status: string;
}

export interface Tournament {
  id: string;
  title: string;
  mode: TournamentMode;
  playerType: PlayerType; // pve | pvp | pvpve
  status: TournamentStatus;
  totalRounds: number; // обычный матч - два или три раунда (рейда), шоу-матч - три
  /** match - обычный матч, show - шоу-матч из расписания. */
  format?: MatchFormat;
  ratingMultiplier: number; // жетон «×2 рейтинга»: 1 — обычный матч, 2 — считается за два (двойное Elo, W/L +2)
  maps: string[];
  startsAt?: string | null;
  /** Приз шоу-матча. */
  prize?: string;
  /** Картинка анонса шоу-матча (same-origin /media/...). */
  previewUrl?: string;
  winnerParticipantId?: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount?: number;
  hasSpace?: boolean;
  /** В списках: стороны по порядку со счётом. */
  score?: SideScore[];
  /** В списках: карты по раундам; у сыгранного матча - только сыгранные. */
  roundMaps?: string[];
  participants?: Participant[];
  rounds?: Round[];
  mmrChanges?: ParticipantMmr[]; // изменение MMR сторон за этот матч (для завершённых)
}

/** Сторона матча в списках: имя, очки и победила ли она. */
export interface SideScore {
  name: string;
  points: number;
  winner?: boolean;
}

/** Изменение MMR стороны за конкретный матч (страница турнира). */
export interface ParticipantMmr {
  participantId: string;
  before: number;
  after: number;
  delta: number;
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
  losses: number; // без ничьих
  tournaments: number; // матчей, вместе с ничьими
  tags?: UserTag[]; // теги, видные на сайте
}

/** Игрок в составе команды 2×2 (для командного лидерборда). */
export interface TeamMember {
  userId: string;
  login: string;
  displayName: string;
  avatarUrl: string;
  tags?: UserTag[]; // теги, видные на сайте
}

/** Строка рейтинга 2×2 по КОМАНДАМ (пара игроков = команда с одним MMR).
    wins/losses/games учитывают жетон ×2 (матч = 2). */
export interface TeamLeaderboardRow {
  teamKey: string;
  name: string;
  mmr: number;
  wins: number;
  losses: number;
  games: number;
  members: TeamMember[];
}

/** Одна точка динамики MMR (для графика и ленты матчей). */
export interface MmrPoint {
  tournamentId: string;
  title: string;
  date?: string | null;
  opponent: string;
  opponentKey?: string; // login (1×1) или teamKey (2×2) — для ссылки
  map: string;
  mmr: number; // MMR после матча
  delta: number;
  win: boolean;
  mult: number; // 2 = жетон ×2
  /** Сколько матчей засчитывает (×2 прошлых сезонов - два). */
  games?: number;
  /** id сезона; пусто - матч вне сезонов. */
  season?: string;
  /** Не матч, а сверка рейтинга с официальными цифрами. */
  correction?: boolean;
}

/** Сводная статистика по исходам (игрок 1×1 или команда 2×2). */
export interface MmrStats {
  firstMatch?: string | null;
  currentMmr: number;
  peakMmr: number;
  wins: number;
  losses: number;
  games: number;
  winrate: number; // 0..100
  bestWinStreak: number;
  bestLossStreak: number;
  currentStreakKind: "win" | "loss" | "";
  currentStreakLen: number;
  place: number; // место в таблице (0 — вне рейтинга)
}

/** Разбивка матчей по карте. */
export interface MapStat {
  map: string;
  games: number;
  wins: number;
  losses: number;
}

/** Head-to-head против соперника (игрока или команды). */
export interface OpponentStat {
  name: string;
  login?: string; // соперник-игрок (1×1)
  teamKey?: string; // соперник-команда (2×2)
  games: number;
  wins: number;
  losses: number;
}

/** Разбивка матчей одного сезона по картам и соперникам и ноки игрока. */
export interface SeasonAnalytics {
  maps: MapStat[];
  opponents: OpponentStat[];
  knocks: KnockStats;
}

/** Ноки игрока за сезон - только по матчам, где ноки записаны хотя бы одной стороне. */
export interface KnockStats {
  matches: number;
  knocks: number;
  best: number; // больше всего ноков за один матч
  bestMatch?: string;
  bestOpponent?: string;
}

/** Краткая карточка команды игрока (список команд в профиле). */
export interface TeamSummary {
  teamKey: string;
  name: string;
  members: TeamMember[];
  mmr: number;
  wins: number;
  losses: number;
  games: number;
  place: number;
}

/** Публичная страница команды 2×2: GET /api/teams/{teamKey}. */
export interface TeamProfile {
  teamKey: string;
  name: string;
  members: TeamMember[];
  stats: MmrStats;
  timeline: MmrPoint[];
  maps: MapStat[];
  opponents: OpponentStat[];
}

export type TaskCategory = "task" | "protocol";

export interface CatalogTask {
  id: string;
  text: string;
  points: number;
  valueType: ValueType;
  kind: TaskKind;
  source: CatalogSource;
  author?: string;
  title?: string;
  /** Название задания, например «Голыми руками». */
  name?: string;
  category: TaskCategory;
  /** Задание на карту; пусто - универсальное. */
  mapCode?: string;
  /** Выключенные не раздаются, но остаются в истории матчей. */
  active: boolean;
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
  name?: string;
  category: TaskCategory;
  mapCode?: string;
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
  roundId?: string | null;
  roundNumber?: number;
  legendaryText?: string;
  points?: number;
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
  /** Протокол 3 сезона: награда за выполнение (+1); у старого протокола-штрафа нет. */
  reward?: number;
  /** Протокол 3 сезона выполнен. */
  done?: boolean;
}

/** Ход пиков-банов в оверлее. */
export interface LiveVeto {
  mapCode: string;
  mapName: string;
  action: VetoActionKind;
  side?: "A" | "B" | "";
  sideName?: string;
  round?: number;
}

/** Сторона матча в оверлее с суммарными очками (по всем раундам). */
export interface LiveStanding {
  participantId?: string;
  name: string;
  points: number;
  /** Очки за текущий раунд (для опции «счёт за раунд» в табло). */
  roundPoints?: number;
  /** MMR сезона; после матча - уже с его итогом. */
  mmr?: number;
  /** Изменение MMR за завершённый матч. */
  mmrDelta?: number;
  /** Место в таблице 1×1 сезона; 0 - в сезоне ещё не играл. */
  place?: number;
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
  /** Карта текущего раунда. */
  currentMap?: string;
  stage?: MatchStage;
  veto?: LiveVeto[];
}

/** Контракт стороны в оверлее (виджет «Контракты»). */
export interface LiveBonus {
  text: string;
  points: number;
  valueType: ValueType;
  times: number; // 0 — не зачтён, >0 — зачтён (подсветка)
  who?: string; // имя стороны-владельца
  opponent?: boolean; // задание противника фокусной стороны
  category?: "task" | "map" | "protocol";
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
  | "logo"
  | "veto";

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
  /** Табло: показывать MMR сторон. */
  showMmr?: boolean;
  /** Табло: показывать места сторон в таблице сезона. */
  showPlace?: boolean;
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
  /** Адрес пресета в ссылке для OBS: /overlay/<slug>. Уникален, правится в кабинете. */
  slug: string;
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
  /** Изменение MMR игрока (или его команды) за матч. */
  mmrDelta?: number;
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
  mmr1x1: MmrStats;
  timeline1x1: MmrPoint[];
  /** По картам и соперникам: ключ - id сезона, пусто - матчи вне сезонов. */
  analytics1x1: Record<string, SeasonAnalytics>;
  teams: TeamSummary[];
}

/** Пользователь + агрегаты участия: GET /api/users/overview (кабинет, раздел «Пользователи»). */
export interface UserOverview extends User {
  email?: string;
  tournaments: number; // завершённых турниров
  wins: number; // побед в завершённых
  points: number; // суммарные очки в завершённых
  participations: number; // всего участий (включая текущие/анонсы)
  isPlaceholder: boolean; // импортный аккаунт-заглушка (можно выдать доступ по ссылке)
}

/** Данные страницы активации аккаунта по ссылке (GET /api/claim/{token}). */
export interface ClaimInfo {
  login: string;
  displayName: string;
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

/** Ответ GET /api/leaderboard?mode=1x1 — ОБЁРНУТ в { mode, seasonId, rows }. */
export interface LeaderboardResponse {
  mode: TournamentMode;
  seasonId?: string;
  rows: LeaderboardRow[];
}

/** Ответ GET /api/leaderboard?mode=2x2 — строки по КОМАНДАМ. */
export interface TeamLeaderboardResponse {
  mode: TournamentMode;
  seasonId?: string;
  rows: TeamLeaderboardRow[];
}

/** Сезон рейтинга (GET /api/seasons). */
export interface Season {
  id: string;
  name: string;
  status: "active" | "finished";
  startedAt: string;
  endedAt?: string | null;
  createdAt: string;
  /** Шаг Эло в сезоне (в 3 сезоне - 100). */
  kFactor: number;
  /** MMR, с которого все начинают сезон. */
  startMmr: number;
}

/** Карта из справочника: код, название и превью. */
export interface MapInfo {
  code: string;
  name: string;
  image: string;
  sortOrder: number;
}

export type VetoActionKind = "ban" | "pick" | "rest";

/** Ход пиков-банов матча. */
export interface VetoAction {
  seq: number;
  action: VetoActionKind;
  side: "A" | "B" | "";
  mapCode: string;
  mapName: string;
  roundNumber?: number | null;
}

/** Запись журнала матча. */
export interface MatchLogEntry {
  id: string;
  roundNumber: number;
  participantId?: string | null;
  kind: "task" | "points" | "knock" | "legendary";
  text: string;
  delta: number;
  createdAt: string;
}

/** Очки стороны за раунд. */
export interface RoundScore {
  roundNumber: number;
  participantId: string;
  points: number;
}

/** Сколько ноков у стороны за раунд. */
export interface RoundKnocks {
  roundNumber: number;
  participantId: string;
  knocks: number;
}

/** Стадия матча: запланирован, пики-баны, карты готовы, идёт раунд, завершён. */
export type MatchStage = "scheduled" | "veto" | "ready" | "round" | "finished";

export type MatchFormat = "match" | "show";

/** Ход в порядке пиков-банов: кто ходит, что делает и в какой раунд уходит карта. */
export interface VetoStep {
  action: "ban" | "pick" | "rest";
  side: "A" | "B" | "";
  round?: number;
}

/** Матч целиком: GET /api/tournaments/{id}/match. */
export interface MatchState {
  tournament: Tournament;
  stage: MatchStage;
  currentRound: number;
  veto: VetoAction[];
  vetoOrder: VetoStep[];
  tasks: RoundBonusTask[];
  legendary: LegendaryCompletion[];
  scores: RoundScore[];
  manual: RoundScore[]; // вместе с очками за ноки
  knocks: RoundKnocks[];
  log: MatchLogEntry[];
}

/** Сторона матча для его страницы. У сыгранного матча mmr - рейтинг перед ним, у остальных - текущий,
    вместе с местом и счётом в сезоне и тем, сколько MMR стоит на кону. */
export interface MatchupSide {
  participantId: string;
  teamKey?: string;
  players: TeamMember[];
  /** 0 - неизвестен: матч не менял рейтинг. */
  mmr: number;
  place?: number;
  wins: number;
  losses: number;
  isNew: boolean;
  /** Шанс победы по MMR, проценты. */
  winChance?: number;
  winGain?: number;
  lossDrop?: number;
}

/** Другая сыгранная встреча тех же сторон. winner: 0 - A, 1 - B, -1 - ничья. */
export interface HeadToHeadMatch {
  tournamentId: string;
  date?: string | null;
  winner: number;
  map?: string;
  games: number;
}

/** GET /api/tournaments/{id}/matchup: противостояние сторон для страницы матча. */
export interface Matchup {
  season?: { id: string; name: string; kFactor: number };
  sides: MatchupSide[];
  headToHead: { wins: [number, number]; draws: number; matches: HeadToHeadMatch[] };
}

/** GET /api/matches/current: идущий матч или, если никто не играет, последний сыгранный. */
export interface CurrentMatchResponse {
  current: MatchState | null;
  last: MatchState | null;
}

/** Игрок для выбора стороны матча: MMR и счёт текущего сезона. */
export interface MatchPlayer {
  id: string;
  login: string;
  displayName: string;
  mmr: number;
  wins: number;
  losses: number;
  /** В текущем сезоне ещё не играл. */
  isNew: boolean;
  isPlaceholder: boolean;
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
