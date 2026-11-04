/** Профиль открыли по прежнему нику (его сменил модератор) - нужен адрес с новым. Регистр не считается сменой. */
export function profileMovedTo(requested: string, actual: string): string | null {
  let asked = requested;
  try {
    asked = decodeURIComponent(requested);
  } catch {
    /* адрес не раскодировался - сравниваем как есть */
  }
  return asked.toLowerCase() === actual.toLowerCase() ? null : `/profile/${encodeURIComponent(actual)}`;
}
