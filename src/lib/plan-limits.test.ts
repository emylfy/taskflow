import { describe, it, expect } from 'vitest';
import {
  parseFeatures,
  FREE_FEATURES,
  TEAM_FEATURES,
  LimitExceededError,
} from './plan-limits';

describe('parseFeatures', () => {
  it('возвращает структуру новой схемы без изменений', () => {
    expect(parseFeatures(TEAM_FEATURES)).toBe(TEAM_FEATURES);
  });

  it('старую схему (массив строк) трактует как Free, сохраняя display', () => {
    const result = parseFeatures(['Старый пункт', 'Ещё пункт']);
    expect(result.limits).toEqual(FREE_FEATURES.limits);
    expect(result.flags).toEqual(FREE_FEATURES.flags);
    expect(result.display).toEqual(['Старый пункт', 'Ещё пункт']);
  });

  it('null/undefined → Free', () => {
    expect(parseFeatures(null)).toBe(FREE_FEATURES);
    expect(parseFeatures(undefined)).toBe(FREE_FEATURES);
  });

  it('мусор (число, строка, объект без limits) → Free', () => {
    expect(parseFeatures(42)).toBe(FREE_FEATURES);
    expect(parseFeatures('plan')).toBe(FREE_FEATURES);
    expect(parseFeatures({ foo: 'bar' })).toBe(FREE_FEATURES);
  });
});

describe('LimitExceededError', () => {
  it('для проектов: поля и текст сообщения', () => {
    const err = new LimitExceededError('projects', 2, 'Бесплатный');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('LimitExceededError');
    expect(err.kind).toBe('projects');
    expect(err.limit).toBe(2);
    expect(err.currentPlanName).toBe('Бесплатный');
    expect(err.message).toContain('проектов');
    expect(err.message).toContain('(2)');
    expect(err.message).toContain('Бесплатный');
  });

  it('для участников: подставляет слово «участников»', () => {
    const err = new LimitExceededError('members', 20, 'Командный');
    expect(err.message).toContain('участников');
    expect(err.message).toContain('Командный');
  });
});
