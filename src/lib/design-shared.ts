/* Дизайн публичной части сайта: прежний («classic») или новый в стиле ARC Raiders («surface»).
   Общий выбор хранится на бэкенде, личный предпросмотр - в cookie браузера. */

export type Design = "classic" | "surface";

/** Cookie личного предпросмотра: перекрывает общий выбор только в этом браузере. */
export const DESIGN_COOKIE = "rsp_design";

export function isDesign(v: unknown): v is Design {
  return v === "classic" || v === "surface";
}

export const DESIGN_LABEL: Record<Design, string> = {
  classic: "Классический",
  surface: "Новый",
};
