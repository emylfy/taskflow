// Превращает технические ошибки авторизации (часто на английском, из better-auth
// или fetch) в понятное русское сообщение. Никогда не показываем сырой текст
// ошибки пользователю — только аккуратную формулировку на русском.
export function ruAuthError(e: unknown): string {
  const raw = (e instanceof Error ? e.message : String(e ?? '')).toLowerCase();
  if (!raw) return 'Не удалось выполнить вход. Попробуйте ещё раз.';
  if (raw.includes('fetch') || raw.includes('network') || raw.includes('failed to'))
    return 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.';
  if (raw.includes('rate') || raw.includes('many') || raw.includes('429'))
    return 'Слишком много попыток. Подождите минуту и попробуйте снова.';
  if (raw.includes('email'))
    return 'Проверьте корректность адреса электронной почты.';
  if (raw.includes('disabled') || raw.includes('not enabled') || raw.includes('provider'))
    return 'Этот способ входа сейчас недоступен.';
  return 'Не удалось выполнить вход. Попробуйте ещё раз.';
}
