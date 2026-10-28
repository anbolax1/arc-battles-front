/* Выбор дизайна на сервере. ТОЛЬКО для серверных компонентов. */

import { cache } from "react";
import { cookies } from "next/headers";
import { serverFetch } from "@/lib/server-api";
import { DESIGN_COOKIE, isDesign, type Design } from "@/lib/design-shared";

/** Общие настройки сайта; бэкенд недоступен - null. */
export const getSite = cache(async (): Promise<{ design?: string; subscriberRole?: string } | null> => {
  try {
    return await serverFetch<{ design?: string; subscriberRole?: string }>("/site");
  } catch {
    return null;
  }
});

/** Дизайн, включённый для всех посетителей. Бэкенд недоступен - прежний. */
export const getSiteDesign = cache(async (): Promise<Design> => {
  const s = await getSite();
  return isDesign(s?.design) ? s.design : "classic";
});

/** Дизайн для текущего посетителя: личный предпросмотр важнее общего выбора. */
export const getDesign = cache(async (): Promise<Design> => {
  const preview = (await cookies()).get(DESIGN_COOKIE)?.value;
  if (isDesign(preview)) return preview;
  return getSiteDesign();
});
