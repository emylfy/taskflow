// Общие константы темы. Лежат в обычном (не 'use client') модуле, чтобы их можно
// было импортировать и в серверный layout, и в клиентский ThemeProvider. Если
// держать их в 'use client'-модуле, Next отдаёт серверу client-reference вместо
// самого значения, и cookies().get(THEME_COOKIE) перестаёт находить cookie.
export type Theme = 'light' | 'dark';

export const THEME_COOKIE = 'theme';
