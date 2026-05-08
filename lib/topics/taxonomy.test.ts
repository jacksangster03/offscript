import { describe, expect, it } from 'vitest'
import {
  TOP_LEVEL_CATEGORIES,
  TOP_LEVEL_CATEGORY_NAMES,
  categoryNameFromSlug,
  isTopLevelCategoryName,
  toCategorySlug,
} from './taxonomy'

describe('topics taxonomy', () => {
  it('contains the expected 40 top-level categories', () => {
    expect(TOP_LEVEL_CATEGORY_NAMES.length).toBe(40)
    expect(TOP_LEVEL_CATEGORIES.length).toBe(40)
  })

  it('builds stable slugs', () => {
    expect(toCategorySlug('Business & Economics')).toBe('business-and-economics')
    expect(toCategorySlug('Art, Design & Aesthetics')).toBe('art-design-and-aesthetics')
  })

  it('validates known names', () => {
    expect(isTopLevelCategoryName('Science')).toBe(true)
    expect(isTopLevelCategoryName('Not A Category')).toBe(false)
  })

  it('resolves names from slug', () => {
    expect(categoryNameFromSlug('weird-obscure-and-random')).toBe('Weird, Obscure & Random')
    expect(categoryNameFromSlug('unknown')).toBeNull()
  })
})
