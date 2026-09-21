import { jest } from '@jest/globals';
import { parseProblemCategoriesFromBody } from '../src/utils/growthTrackCategories.js';

describe('growthTrackCategories — parseProblemCategoriesFromBody', () => {
  test('accepts problemCategories array', () => {
    const result = parseProblemCategoriesFromBody({
      problemCategories: ['productivity', 'attendance'],
    });
    expect(result.error).toBeUndefined();
    expect(result.categories).toEqual(['productivity', 'attendance']);
  });

  test('deduplicates categories', () => {
    const result = parseProblemCategoriesFromBody({
      problemCategories: ['quality', 'quality', 'communication'],
    });
    expect(result.categories).toEqual(['quality', 'communication']);
  });

  test('falls back to legacy problemCategory string', () => {
    const result = parseProblemCategoriesFromBody({ problemCategory: 'attendance' });
    expect(result.categories).toEqual(['attendance']);
  });

  test('rejects empty selection', () => {
    const result = parseProblemCategoriesFromBody({ problemCategories: [] });
    expect(result.error).toMatch(/At least one/);
  });

  test('rejects invalid category', () => {
    const result = parseProblemCategoriesFromBody({ problemCategories: ['invalid'] });
    expect(result.error).toMatch(/Invalid problem category/);
  });
});
