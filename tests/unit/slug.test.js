import { slugify } from '../../server/src/utils/slug.js'

describe('slugify', () => {
  test('normalizes names into lowercase url-safe slugs', () => {
    expect(slugify('React Fundamentals: Hooks & Routing!')).toBe('react-fundamentals-hooks-routing')
  })

  test('falls back to item when text has no ascii letters or numbers', () => {
    expect(slugify('---')).toBe('item')
  })
})
