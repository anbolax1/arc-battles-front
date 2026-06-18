/* Иерархия ролей — зеркало backend/internal/models (roleLevels). Роль с бóльшим
   уровнем имеет все доступы ролей ниже. Уровни разрежены (10, 100), чтобы новые
   роли (например moderator=50) вставлялись между существующими без переписывания. */

import type { Role } from "@/lib/types";

const ROLE_LEVEL: Record<string, number> = {
  user: 10,
  superadmin: 100,
};

/** Уровень роли (неизвестная/отсутствующая роль → 0, ниже любой валидной). */
export function roleLevel(role: string | null | undefined): number {
  return role ? (ROLE_LEVEL[role] ?? 0) : 0;
}

/** Роль не ниже требуемой — иерархическая проверка доступа на клиенте. */
export function roleAtLeast(role: string | null | undefined, min: Role): boolean {
  return roleLevel(role) >= roleLevel(min);
}
