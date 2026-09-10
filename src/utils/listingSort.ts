export const LISTING_SORTS = ['newest', 'relevant', 'closest', 'price-low', 'price-high'] as const;
export type ListingSort = typeof LISTING_SORTS[number];

export function listingSortStages(sort: ListingSort, nearTerm = '', hasSearch = false): any[] {
  const tieBreak = { createdAt: -1, id: 1 };
  if (sort === 'price-low' || sort === 'price-high') {
    return [
      { $set: { _priceMatch: { $regexFind: { input: { $ifNull: ['$price', ''] }, regex: /\d+(?:,\d{3})*(?:\.\d+)?/ } } } },
      { $set: { _priceAmount: { $cond: [
        { $regexMatch: { input: { $ifNull: ['$price', ''] }, regex: /^\s*free\s*$/i } },
        0,
        { $convert: { input: { $replaceAll: { input: '$_priceMatch.match', find: ',', replacement: '' } }, to: 'double', onError: null, onNull: null } },
      ] } } },
      { $set: { _priceMissing: { $cond: [{ $eq: ['$_priceAmount', null] }, 1, 0] } } },
      { $sort: { _priceMissing: 1, _priceAmount: sort === 'price-low' ? 1 : -1, ...tieBreak } },
      { $project: { _priceMatch: 0, _priceAmount: 0, _priceMissing: 0 } },
    ];
  }
  if (sort === 'closest' && nearTerm) {
    const regex = new RegExp(nearTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return [
      { $set: { _nearMatch: { $cond: [{ $regexMatch: { input: { $ifNull: ['$location', ''] }, regex } }, 0, 1] } } },
      { $sort: { _nearMatch: 1, ...tieBreak } },
      { $project: { _nearMatch: 0 } },
    ];
  }
  return [{ $sort: sort === 'relevant' && hasSearch ? { score: { $meta: 'textScore' }, ...tieBreak } : tieBreak }];
}
