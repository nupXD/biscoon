const CATEGORY_ALIASES: Record<string, string> = {
  pg: 'paying-guest',
  rojgar: 'jobs',
  students: 'student',
  realestate: 'real-estate',
};

const CATEGORY_LEGACY_ALIASES: Record<string, string[]> = {
  'paying-guest': ['pg'],
  jobs: ['rojgar'],
  student: ['students'],
  'real-estate': ['realestate'],
};

const CATEGORY_GROUPS: Record<string, string[]> = {
  jobs: ['jobs', 'tech', 'healthcare', 'insurance', 'cpa', 'legal', 'finance', 'education', 'student', 'tutoring', 'ai-services', 'immigration', 'rojgar'],
  housing: ['housing', 'paying-guest', 'pg', 'real-estate', 'realestate', 'moving'],
  marketplace: ['marketplace', 'kinbech', 'services', 'restaurants', 'shops', 'childcare', 'beauty', 'auto', 'cleaning', 'produce', 'business-for-sale', 'translation'],
  community: ['community', 'organizations', 'events', 'literature', 'music', 'art', 'sports', 'yoga', 'jyotish', 'matchmaker', 'matrimony', 'pen-pals', 'travel'],
  other: ['other'],
};

const SPECIFIC_TYPE_TO_CATEGORY: Record<string, string> = Object.entries(CATEGORY_GROUPS).reduce<Record<string, string>>((acc, [category, values]) => {
  values.forEach(value => {
    if (value !== category) acc[value] = category;
  });
  return acc;
}, {});

function normalizeCategory(value: string): string {
  const clean = String(value || '').trim();
  return CATEGORY_ALIASES[clean] || clean;
}

function categoryQuery(value: string): string | { $in: string[] } {
  const normalized = normalizeCategory(value);
  if (CATEGORY_GROUPS[normalized]) return { $in: CATEGORY_GROUPS[normalized] };
  const aliases = CATEGORY_LEGACY_ALIASES[normalized] || [];
  return aliases.length ? { $in: [normalized, ...aliases] } : normalized;
}

function subcategoryQuery(value: string): string | { $in: string[] } {
  const normalized = normalizeCategory(value);
  const aliases = CATEGORY_LEGACY_ALIASES[normalized] || [];
  return aliases.length ? { $in: [normalized, ...aliases] } : normalized;
}

function listingCategoryFilter(category: string, subcategory: string): Record<string, unknown> {
  const normalizedCategory = normalizeCategory(category);
  const normalizedSubcategory = normalizeCategory(subcategory);
  if (!normalizedCategory) return {};

  if (normalizedCategory === 'photography' && !normalizedSubcategory) {
    return {
      $or: [
        { category: 'photography' },
        { category: 'marketplace', subcategory: subcategoryQuery('photography') },
      ],
    };
  }

  if (normalizedSubcategory) {
    return {
      $or: [
        { category: normalizedCategory, subcategory: subcategoryQuery(normalizedSubcategory) },
        { category: categoryQuery(normalizedSubcategory) },
      ],
    };
  }

  const parentCategory = SPECIFIC_TYPE_TO_CATEGORY[normalizedCategory];
  if (parentCategory) {
    return {
      $or: [
        { category: parentCategory, subcategory: subcategoryQuery(normalizedCategory) },
        { category: categoryQuery(normalizedCategory) },
      ],
    };
  }

  return { category: categoryQuery(normalizedCategory) };
}

export {
  normalizeCategory,
  categoryQuery,
  subcategoryQuery,
  listingCategoryFilter,
};
