export const TOP_LEVEL_CATEGORY_NAMES = [
  'Science',
  'Technology',
  'Business & Economics',
  'History',
  'Geography & Places',
  'Politics & Power',
  'Philosophy & Ideas',
  'Psychology & Human Behaviour',
  'Communication & Language',
  'Culture & Society',
  'Art, Design & Aesthetics',
  'Literature, Film & Media',
  'Music & Sound',
  'Health, Medicine & Human Performance',
  'Sport, Games & Competition',
  'Food, Agriculture & Environment',
  'Nature, Animals & the Living World',
  'Religion, Mythology & Belief',
  'Law, Crime & Justice',
  'War, Strategy & Security',
  'Space & the Cosmos',
  'The Future',
  'Personal Development & Life Skills',
  'Education & Learning',
  'Travel & Adventure',
  'Engineering, Infrastructure & Built World',
  'Energy, Climate & Resources',
  'Fashion, Status & Lifestyle',
  'Internet, Memes & Digital Culture',
  'Weird, Obscure & Random',
  'Concepts & Mental Models',
  'People & Biography',
  'Objects, Inventions & Everyday Things',
  'Emotions, Relationships & Social Life',
  'Ethics, Dilemmas & Controversies',
  'Explanations of Modern Life',
  'Debate Motions',
  'Make Boring Things Interesting',
  'Cross-Domain Connections',
  'Personal Opinion Prompts',
] as const

export type TopLevelCategoryName = (typeof TOP_LEVEL_CATEGORY_NAMES)[number]

export interface SeededTopicCategory {
  slug: string
  name: TopLevelCategoryName
  description: string
  depth: 0
}

export const TOP_LEVEL_CATEGORIES: SeededTopicCategory[] = TOP_LEVEL_CATEGORY_NAMES.map((name) => ({
  slug: toCategorySlug(name),
  name,
  description: `${name} prompts and conversation drills`,
  depth: 0,
}))

export function toCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isTopLevelCategoryName(name: string): name is TopLevelCategoryName {
  return TOP_LEVEL_CATEGORY_NAMES.includes(name as TopLevelCategoryName)
}

export function categoryNameFromSlug(slug: string): TopLevelCategoryName | null {
  const found = TOP_LEVEL_CATEGORIES.find((item) => item.slug === slug)
  return found?.name ?? null
}

export function categoryHeatmapGroups() {
  return [
    {
      group: 'Knowledge',
      slugs: [
        'science',
        'technology',
        'business-and-economics',
        'history',
        'geography-and-places',
        'politics-and-power',
        'philosophy-and-ideas',
        'psychology-and-human-behaviour',
      ],
    },
    {
      group: 'Conversation',
      slugs: [
        'communication-and-language',
        'culture-and-society',
        'debate-motions',
        'cross-domain-connections',
        'personal-opinion-prompts',
      ],
    },
    {
      group: 'Creative',
      slugs: [
        'art-design-and-aesthetics',
        'literature-film-and-media',
        'music-and-sound',
        'internet-memes-and-digital-culture',
        'make-boring-things-interesting',
      ],
    },
  ]
}
