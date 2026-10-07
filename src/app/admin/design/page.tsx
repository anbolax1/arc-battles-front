import { cookies } from "next/headers";
import { getSiteDesign } from "@/lib/design";
import { DESIGN_COOKIE, isDesign } from "@/lib/design-shared";
import { DesignSwitcher } from "@/components/admin/design-switcher";

export const metadata = { title: "Дизайн сайта — Кабинет" };

export default async function AdminDesignPage() {
  const [current, jar] = await Promise.all([getSiteDesign(), cookies()]);
  const preview = jar.get(DESIGN_COOKIE)?.value;
  return <DesignSwitcher current={current} preview={isDesign(preview) ? preview : null} />;
}
