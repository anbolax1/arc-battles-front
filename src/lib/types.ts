/* TS-типы, зеркалящие модели Go-бэкенда (backend/internal/models).
   Это копия контракта, НЕ импорт из бэкенда — проекты независимы. */

export type Role = "user" | "subscriber" | "moderator" | "superadmin";
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
  /** Тег выдаёт сайт сам по своему правилу: honor - «Почётный носитель» пояса лиги. */
  code?: string;
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
  /** Матч не засчитан: сыгран, но без исхода; MMR сменился только у победителя. */
  voided?: boolean;
  /** Почему матч не засчитан. */
  voidReason?: string;
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
  /** Сегодня без очереди: в пуле выше остальных. */
  priority?: boolean;
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
  patches?: PatchCode[]; // самые редкие нашивки сезона, до трёх
  patchCount?: number; // всего нашивок в сезоне
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
  /** Не матч, а сброс рейтинга жетоном: MMR снова стартовый. */
  reset?: boolean;
  /** Матч не засчитан: сыгран, но в победы и серии не идёт. */
  voided?: boolean;
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

/** Разбивка матчей одного сезона по картам и соперникам, ноки и задания игрока. */
export interface SeasonAnalytics {
  maps: MapStat[];
  opponents: OpponentStat[];
  knocks: KnockStats;
  /** Свои выполненные задания: по ним растёт «Исполнитель». */
  tasks?: number;
}

/** Ноки игрока за сезон - только по матчам, где ноки записаны хотя бы одной стороне. */
export interface KnockStats {
  matches: number;
  knocks: number;
  best: number; // больше всего ноков за один матч
  bestMatch?: string;
  bestOpponent?: string;
}

/* ---------- нашивки: выдаются сами по матчам 1×1 ---------- */

export type PatchCode =
  | "top1" | "belt" | "regicide"
  | "streak" | "flawless" | "david" | "comeback" | "double" | "photo" | "shutout" | "revenge"
  | "executor" | "hunter" | "clear" | "topknock" | "pacifist" | "king"
  | "first" | "final" | "marathon" | "veteran";

/** Подробности нашивки для подписи; набор полей свой у каждой. */
export interface PatchDetail {
  opp?: string;
  score?: [number, number];
  n?: number;
  best?: number;
  wins?: number;
  knocks?: number;
  tasks?: number;
  map?: string;
  maps?: string[];
  games?: number;
  mmr?: number;
  reigns?: number;
  defenses?: number;
  /** «Против шансов»: самый низкий шанс победителя в сезоне, проценты. */
  chance?: number;
}

export interface PlayerPatch {
  seasonId: string;
  code: PatchCode;
  tier: number;
  matchId?: string;
  earnedAt: string;
  /** Сезон идёт: итоговая нашивка закрепится при его закрытии. */
  provisional?: boolean;
  detail: PatchDetail;
  /** Сколько рейдеров сезона носят эту нашивку. */
  holders: number;
}

export interface PatchSeason {
  /** Сколько рейдеров играло в сезоне: от этого редкость. */
  players: number;
  final: boolean;
  items: PlayerPatch[];
}

export interface PatchHolder {
  login: string;
  displayName: string;
  tier: number;
  provisional?: boolean;
}

export interface PatchStat {
  code: PatchCode;
  holders: number;
  /** Сколько рейдеров на каждой ступени, начиная с первой. */
  tiers?: number[];
  /** Владельцы по месту в таблице сезона. */
  top: PatchHolder[];
}

export interface PatchCatalog {
  season: Season;
  players: number;
  patches: PatchStat[];
}

export interface MatchPatch {
  participantId: string;
  code: PatchCode;
  tier: number;
  detail: PatchDetail;
}

/** Нашивка, полученная в идущем матче: оверлей показывает её плашкой. */
export interface PatchFlash {
  id: string;
  name: string;
  code: PatchCode;
  tier: number;
  detail: PatchDetail;
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
  /** Лента - за все сезоны, MMR и место - в текущем сезоне (не игравшая в нём команда - место 0). */
  stats: MmrStats;
  timeline: MmrPoint[];
  maps: MapStat[];
  opponents: OpponentStat[];
  /** Карты и соперники по сезонам: ключ - id сезона, пусто - матчи вне сезонов. */
  analytics?: Record<string, SeasonAnalytics>;
}

export type TaskCategory = "task" | "protocol";
/** Тег задания на экране: «обычное» или «на время». */
export type TaskTag = "normal" | "timed";

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
  tag: TaskTag;
  /** Карты задания; пусто - общее, на любую карту. */
  mapCodes: string[];
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
  /** Игрок команды 2×2, которому засчитано задание. */
  completedUserId?: string | null;
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
  tag?: TaskTag;
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
  /** Игрок в сезоне ещё не играл, места в таблице у него нет. */
  isNew?: boolean;
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
  complications?: LiveComplication[]; // протоколы: в матче - стороны в рейде, в старом пульте - обеих сторон
  /** Кастомизируемая раскладка модульного оверлея. Если нет — рендерится DEFAULT_LAYOUT. */
  layout?: OverlayLayout | null;
  /** Карта текущего раунда. */
  currentMap?: string;
  stage?: MatchStage;
  veto?: LiveVeto[];
  /** Нашивки, полученные в идущем матче: каждая новая показывается плашкой. */
  patchFlashes?: PatchFlash[];
  /** Матч идёт за пояс лиги: табло отмечает носителя, после матча - итог. */
  belt?: LiveBelt | null;
  /** Шансы сторон (в порядке standings) и ничьей сейчас. */
  chance?: Chance | null;
  /** Как менялся шанс в этом матче: для графика шанса. */
  chanceTrail?: ChanceDot[];
  /** Счёт после всех рейдов равный: стороны играют дуэль до первого нока. */
  duel?: boolean;
}

/** Пояс лиги в идущем матче. */
export interface LiveBelt {
  /** Пусто - пояс ничей, его разыгрывает этот матч. */
  holderParticipantId?: string;
  defenses: number;
  /** После матча: defense - отбился, take - пояс сменил хозяина, pick - подобрал ничей. */
  result?: "defense" | "take" | "pick";
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
  tag?: TaskTag;
}

/** Типы виджетов модульного оверлея. */
export type WidgetType =
  | "scoreboard"
  | "round"
  | "complications"
  | "standings"
  | "roundTasks"
  | "bonusTasks"
  | "tasksV2"
  | "text"
  | "logo"
  | "veto"
  | "chance";

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
  /** Табло: показывать очки за текущий раунд в скобках рядом с основным счётом. */
  showRoundScore?: boolean;
  /** Контракты: показывать и контракты противника (что можно «украсть» за +1). */
  showOpponentContracts?: boolean;
  /** Задания: плашка «карта» у задания на карту раунда. */
  showTags?: boolean;
  /** Табло: показывать MMR сторон. */
  showMmr?: boolean;
  /** Табло: показывать места сторон в таблице сезона. */
  showPlace?: boolean;
  /** Табло: значок под ником носителя пояса лиги и «за пояс» по центру. */
  showBelt?: boolean;
  /** Табло: шанс на победу под счётом сторон и шанс ничьей по центру. */
  showChance?: boolean;
  /** Табло: полоса шанса под счётом - доли сторон, их шансы по краям и шанс ничьей в подписи. */
  showChanceBar?: boolean;
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
  /** Матч не засчитан: ни победа, ни поражение. */
  voided?: boolean;
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
  /** Где у игрока больше всего побед: матч засчитан на каждую сыгранную в нём карту. */
  bestMap?: string;
  bestMapWins?: number;
  /** Первый сыгранный матч любого формата: у mmr1x1.firstMatch - только 1×1. */
  firstMatch?: string | null;
}

/** Публичный профиль игрока: GET /api/players/{login} (B6). */
export interface PlayerProfile {
  user: User;
  mmrSolo: number; // MMR 1x1 (старт 1000)
  mmrDuo: number; // MMR 2x2 (старт 1000)
  peakDuo?: number; // пик лучшей команды игрока за все сезоны (2x2)
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
  /** Нашивки по сезонам: ключ - id сезона. */
  patches1x1?: Record<string, PatchSeason>;
  /** Часов в ARC Raiders - со скриншота. */
  gameHours?: StatValue;
  /** Ноков в ARC Raiders за всё время - со скриншота. */
  gameKnocks?: StatValue;
  /** Код подтверждённого сервера; по умолчанию Европа. */
  server: string;
  /** Только у подписчика и выше, если что-то выбрано. */
  favorites?: PlayerFavorites;
  tokens: TokenWallet;
}

/** Число из профиля в игре: видно сразу, confirmed - модератор сверил его со скриншотом. */
export interface StatValue {
  value: number;
  confirmed: boolean;
}

export type StatKind = "hours" | "knocks" | "server";
/** Показатели-числа: у сервера вместо числа код региона. */
export type NumericStatKind = Exclude<StatKind, "server">;
export type StatClaimStatus = "pending" | "approved" | "rejected";

/** Число из профиля в игре вместе со скриншотом, который сверяет модератор. */
export interface StatClaim {
  id: string;
  userId: string;
  login?: string;
  displayName?: string;
  kind: StatKind;
  value: number;
  /** Код региона, только у сервера. */
  region?: string;
  /** Подтверждённое раньше: видно, насколько выросло. */
  previous?: number;
  screenshotUrl: string;
  status: StatClaimStatus;
  reason?: string;
  createdAt: string;
  decidedAt?: string | null;
}

/** Любимое игрока: тиммейты (до пяти), карта, оружие, усилитель и щит. */
export interface PlayerFavorites {
  teammates: TeamMember[];
  mapCode?: string;
  map?: string;
  weapon?: string;
  augment?: string;
  shield?: string;
}

/** GET /api/favorites/options: из чего выбирать любимое. */
export interface FavoriteOptions {
  maps: MapInfo[];
  weapons: string[];
  augments: string[];
  shields: string[];
}

export type TokenKind = "double" | "priority" | "reset";

/** Жетоны игрока и когда их можно тратить. */
export interface TokenWallet {
  double: number;
  priority: number;
  reset: number;
  /** «Без очереди» действует до конца игрового дня. */
  priorityUntil?: string;
  /** Раньше этого новый «Без очереди» не активировать. */
  priorityNext?: string;
  /** Когда игрок в последний раз сбросил рейтинг. */
  lastReset?: string;
  /** В текущем сезоне рейтинг уже сброшен. */
  resetUsed?: boolean;
}

/** Строка журнала жетонов: выдача (+N) или трата (-1). */
export interface TokenEntry {
  id: string;
  kind: TokenKind;
  delta: number;
  note?: string;
  tournamentId?: string | null;
  match?: string;
  by?: string;
  createdAt: string;
}

/** Матч игрока, который ещё не начался: на него можно поставить жетон ×2. */
export interface PendingMatch {
  tournamentId: string;
  title: string;
  mode: TournamentMode;
  startsAt?: string | null;
  active: boolean;
  blocked?: string;
}

/** GET /api/users/{id}/moderation: скриншоты, журнал жетонов и матчи для жетона ×2. */
export interface PlayerModeration {
  claims: StatClaim[];
  ledger: TokenEntry[];
  matches: PendingMatch[];
}

/** GET /api/me/extras: свои часы и ноки, любимое, жетоны и можно ли сбросить рейтинг. */
export interface MyExtras {
  claims: StatClaim[];
  favorites: PlayerFavorites;
  canFavorites: boolean;
  /** Подтверждённый сервер: заявка на другой ждёт модератора. */
  server: string;
  tokens: TokenWallet;
  /** Почему сейчас не сбросить рейтинг. */
  resetBlocked?: string;
  mmr: number;
  startMmr: number;
}

/** Жетон ×2, поставленный игроком на матч. */
export interface DoubleToken {
  participantId: string;
  userId: string;
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
  /** Номер для адреса страницы итогов /season/{номер}. */
  number?: number | null;
}

/* ---------- итоги сезона: /api/seasons/{номер}/recap ---------- */

/** Пара [выполнено, выдано]. */
export type DoneOffered = [number, number];

export interface RecapPlayer {
  login: string;
  mmr: number;
  rank: number;
  peak: number;
  peakAt: string;
  low: number;
  wins: number;
  losses: number;
  matches: number;
  winStreak: number;
  lossStreak: number;
  opponents: number;
  first: string;
  tags: string[];
  /** [время в мс, MMR после, 1 - сверка рейтинга]. */
  curve: Array<[number, number, number]>;
}

export interface RecapRound {
  map: string;
  played: boolean;
  points: [number, number];
  knocks: [number, number];
}

export interface RecapMatch {
  id: string;
  at: string;
  /** Индексы игроков в players: стороны A и B. */
  p: [number, number];
  /** 0 | 1, -1 - ничья или незасчитанный матч. */
  winner: number;
  /** Матч не засчитан: победителя для итогов нет. */
  voided?: boolean;
  mult: number;
  games: number;
  show: boolean;
  before: [number, number];
  delta: [number, number];
  /** У матчей из таблицы организатора счёта нет. */
  score?: [number, number];
  rounds: RecapRound[];
  /** Шанс на победу перед матчем. */
  chance?: Chance;
}

export interface RecapDay {
  date: string;
  matches: number;
  new: number;
  /** Места на конец дня, первый - лидер. */
  order: number[];
}

export interface RecapMap {
  code: string;
  name: string;
  ban: number;
  pick: number;
  rest: number;
  rounds: number;
  points: number;
  knocks: number;
  tasksDone: number;
  tasksOffered: number;
}

export interface RecapRoundStat {
  number: number;
  rounds: number;
  points: number;
  knocks: number;
  tasksDone: number;
  tasksOffered: number;
}

export interface RecapTask {
  name: string;
  text: string;
  category: "task" | "protocol";
  map: string;
  done: number;
  offered: number;
}

export interface SeasonRecap {
  season: Season;
  live: boolean;
  summary: {
    matches: number;
    games: number;
    players: number;
    oneMatch: number;
    x2: number;
    detailed: number;
    vetoed: number;
    knocks: number;
    gameDays: number;
    first?: string;
    last?: string;
    startMmr: number;
    corrections: Array<{ at: string; players: number }>;
  };
  players: RecapPlayer[];
  matches: RecapMatch[];
  days: RecapDay[];
  leaders: Array<{ player: number; from: number; to: number }>;
  /** Матч, после которого первым стал итоговый лидер; -1 - лидер не менялся. */
  decisive: number;
  maps: RecapMap[];
  rounds: RecapRoundStat[];
  knockers: Array<{ player: number; knocks: number; matches: number }>;
  bestKnock?: { match: number; player: number; knocks: number };
  comebacks: Array<{ match: number; round1: [number, number] }>;
  tasks: {
    all: DoneOffered;
    mapTasks: DoneOffered;
    general: DoneOffered;
    protocols: DoneOffered;
    distinct: number;
    easy: RecapTask[];
    hard: RecapTask[];
    doers: Array<{ player: number; done: number; offered: number }>;
  };
  /** Побед фаворита по MMR и матчей, где MMR сторон различался. */
  favorites: [number, number];
  upsets: Array<{ match: number; chance: number }>;
  swings: number[];
  rivals: Array<{ a: number; b: number; winsA: number; winsB: number }>;
  weekday: number[];
  hours: number[];
  upcoming: Array<{ id: string; title: string; at?: string; format: string; prize: string }>;
}

/** Карта из справочника: код, название и превью. */
export interface MapInfo {
  code: string;
  name: string;
  image: string;
  sortOrder: number;
  /** С этого момента карта в пуле пиков-банов: в прошлых матчах её не было. */
  addedAt?: string;
}

/** Новость лиги. Без даты публикации - черновик, с датой в будущем - выйдет сама. */
export interface News {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  publishedAt?: string | null;
  /** Дата публикации наступила - новость видна на сайте. */
  published: boolean;
  createdAt: string;
  updatedAt: string;
  /** Новость о поясе лиги, её написал сам сайт: без своей картинки у неё рисунок пояса. */
  belt?: NewsBelt;
}

/** Рисунок пояса у новости о нём. */
export interface NewsBelt {
  /** Ник на поясе. */
  name: string;
  /** Звёзды защит. */
  stars: number;
  /** Пояс выпал и ничей. */
  vacant?: boolean;
}

/** vote - карту выбрал чат голосованием, ведущий ставит её сам. */
export type VetoActionKind = "ban" | "pick" | "rest" | "vote";

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
  kind: "task" | "points" | "knock" | "legendary" | "duel";
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

/** Ноки и ручные очки игрока команды 2×2 за раунд; points - вместе с очками за ноки. */
export interface RoundMemberScore {
  roundNumber: number;
  participantId: string;
  userId: string;
  points: number;
  knocks: number;
}

/** Стадия матча: запланирован, пики-баны, карты готовы, идёт раунд, завершён. */
export type MatchStage = "scheduled" | "veto" | "ready" | "round" | "finished";

export type MatchFormat = "match" | "show";

/** Ход в порядке пиков-банов: кто ходит, что делает и в какой раунд уходит карта. */
export interface VetoStep {
  action: VetoActionKind;
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
  /** Ноки и ручные очки по игрокам команд 2×2. */
  members?: RoundMemberScore[];
  log: MatchLogEntry[];
  /** Нашивки, полученные в этом матче. */
  patches?: MatchPatch[];
  /** Сторона в рейде - её задания и счёт показывает оверлей; приходит только в идущем раунде. */
  focus?: string;
  /** Шансы на победу перед матчем и сейчас; у 2×2 их нет. */
  chance?: MatchChance;
  /** Жетоны ×2 игроков на этот матч. */
  doubles?: DoubleToken[];
  /** Сколько жетонов ×2 у каждого игрока сторон. */
  doubleWallet?: Record<string, number>;
}

/** Шансы стороны A, ничьей и стороны B, доли от 1; в сумме 1. */
export interface Chance {
  a: number;
  draw: number;
  b: number;
}

export interface MatchChance {
  pre: Chance;
  now: Chance;
}

/** Шанс после действия в пульте или закрытия рейда: точка графика матча. */
export interface ChancePoint {
  at: string;
  kind: "start" | "knock" | "task" | "points" | "legendary" | "raid" | "duel" | "end" | "now";
  round: number;
  /** 0 - A, 1 - B, -1 - без стороны. */
  side: number;
  text: string;
  delta?: number;
  score: [number, number];
  chance: Chance;
}

/** GET /api/tournaments/{id}/chance - как менялся шанс по ходу матча. */
export interface ChanceTrail {
  points: ChancePoint[];
  /** Матч идёт: график ещё растёт. */
  live: boolean;
}

/** Точка графика шанса в оверлее. */
export interface ChanceDot {
  a: number;
  draw: number;
  round: number;
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
  /** Шанс на победу перед матчем, проценты. */
  winChance?: number;
  winGain?: number;
  lossDrop?: number;
  /** Жетон ×2: и победа, и поражение вдвое. */
  double?: boolean;
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
  /** Шанс ничьей перед матчем, проценты. */
  drawChance?: number;
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
  /** Матчей в прошлых сезонах: при равном MMR сторона A - у кого меньше. */
  prevGames: number;
  /** Сегодня играет без очереди. */
  priority?: boolean;
}

/** Команда 2×2 из списка организатора (GET /api/match-teams): MMR и счёт - в текущем сезоне. */
export interface MatchTeam {
  teamKey: string;
  name: string;
  members: TeamMember[];
  mmr: number;
  wins: number;
  losses: number;
  /** В текущем сезоне ещё не играла. */
  isNew: boolean;
  /** Матчей в прошлых сезонах: при равном MMR сторона A - у кого меньше. */
  prevGames: number;
  /** Матчей всего, вместе с идущими и запланированными: у такой команды состав не меняется. */
  matches: number;
  lastMatchAt?: string | null;
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

/* ---------- пояс лиги ---------- */

export interface BeltPlayer {
  userId: string;
  login: string;
  displayName: string;
}

export interface BeltDefense {
  at: string;
  matchId: string;
  opponent: BeltPlayer;
  /** Счёт: свой, соперника; у матчей из таблицы организатора очков нет. */
  score?: [number, number];
  /** Матч с жетоном ×2. */
  double?: boolean;
}

/** Одно владение поясом: от матча, где его взяли, до поражения или до того, как он выпал. */
export interface BeltReign {
  holder: BeltPlayer;
  from: string;
  to?: string;
  /** first - первый матч лиги, take - обыграл носителя, pick - подобрал ничей пояс. */
  how: "first" | "take" | "pick";
  matchId: string;
  opponent?: BeltPlayer;
  score?: [number, number];
  defenses: BeltDefense[];
  /** lost - проиграл, drop - выпал; нет - держит сейчас. */
  end?: "lost" | "drop";
  lostTo?: BeltPlayer;
  /** В который раз игрок берёт пояс. */
  time: number;
  /** Какой он по счёту носитель в истории лиги; только у первого раза. */
  newcomer?: number;
}

/** Пояс лиги: у кого он, сколько на нём ржавчины и вся история с первого матча на сайте. */
export interface Belt {
  /** Нет - пояс ничей. */
  holder?: BeltPlayer;
  since?: string;
  defenses: number;
  /** Игровых дней подряд без матча носителя. */
  rust: number;
  /** На столько игровых дней без матча пояс выпадает. */
  rustLimit: number;
  /** Пояс ничей с этого момента. */
  droppedAt?: string;
  /** Ничей пояс разыграет ближайший матч одного из них; пусто - первый матч сезона. */
  leaders?: BeltPlayer[];
  /** Защит за всё время для тега «Почётный носитель». */
  honorAt: number;
  reigns: BeltReign[];
}

/* ---------- Очередь выступлений ---------- */

export type QueueFormat = "1x1" | "2x2";
/** open - идёт запись; closed - запись закрыта, вызовы идут; paused - всё остановлено; finished - сессия закончена. */
export type QueueState = "open" | "closed" | "paused" | "finished";
export type QueueEntryStatus = "waiting" | "invited" | "ready" | "performing" | "skipped";

export interface QueueSession {
  id: string;
  title: string;
  format: QueueFormat;
  state: QueueState;
  registrationOpen: boolean;
  paused: boolean;
  confirmTimeoutSec: number;
  rev: number;
  createdAt: string;
  finishedAt?: string | null;
  createdBy?: string;
  waiting: number;
  played: number;
}

export interface QueueMember {
  userId: string;
  login: string;
  displayName: string;
  avatarUrl: string;
  ready: boolean;
  readyAt?: string | null;
}

export interface QueueEntry {
  id: string;
  position: number;
  status: QueueEntryStatus;
  isNext: boolean;
  name: string;
  teamKey?: string;
  members: QueueMember[];
  mmr: number;
  joinedAt: string;
  performedCount: number;
  skippedCount: number;
  invitedAt?: string | null;
  inviteExpiresAt?: string | null;
  addedByOrganizer?: boolean;
  /** Сегодня действует жетон «Без очереди». */
  priority?: boolean;
}

export interface QueueMatchSide {
  side: number;
  entryId: string;
  name: string;
  mmr: number;
  members: QueueMember[];
  status?: string;
}

export interface QueueMatch {
  id: string;
  number: number;
  status: "preparing" | "live" | "finished" | "cancelled";
  /** Матч сайта, созданный для этой пары. */
  tournamentId?: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  sides: QueueMatchSide[];
}

export interface QueueSessionRef {
  id: string;
  format: QueueFormat;
  state: QueueState;
  title: string;
}

export interface QueueTeamOption {
  teamKey: string;
  name: string;
  members: QueueMember[];
  blocked?: string;
}

export interface QueueMe {
  entryId?: string;
  position?: number;
  ahead: number;
  before?: QueueEntry;
  status?: QueueEntryStatus;
  needsConfirm?: boolean;
  confirmed?: boolean;
  canLeave: boolean;
  canJoin: boolean;
  joinBlocked?: string;
  teams?: QueueTeamOption[];
}

export interface QueueSnapshot {
  serverTime: string;
  session: QueueSession | null;
  entries: QueueEntry[];
  match?: QueueMatch | null;
  last?: QueueMatch | null;
  active: QueueSessionRef[];
  me?: QueueMe;
  history: QueueMatch[];
}

export interface QueueEvent {
  id: number;
  at: string;
  kind: string;
  actor?: string;
  label?: string;
  data?: Record<string, unknown>;
}

/** Вызов игрока на матч: плашка на любой странице сайта. */
export interface QueueCall {
  sessionId: string;
  format: QueueFormat;
  title: string;
  entryId: string;
  name: string;
  status: "invited" | "ready" | "performing";
  position: number;
  inviteExpiresAt?: string | null;
  needsConfirm: boolean;
  confirmed: boolean;
}
