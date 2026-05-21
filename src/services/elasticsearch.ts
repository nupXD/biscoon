import { Client, ApiResponse } from '@elastic/elasticsearch';

const LISTINGS_INDEX = 'biscoon_listings';
const DISCUSSIONS_INDEX = 'biscoon_discussions';

let _client: Client | null = null;

function getClient(): Client | null {
  if (_client) return _client;
  const url = process.env.ELASTICSEARCH_URL;
  if (!url) return null;
  _client = new Client({ node: url });
  return _client;
}

async function isAvailable(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

const LISTING_MAPPINGS = {
  properties: {
    id:           { type: 'keyword' },
    title:        { type: 'text', boost: 3 },
    description:  { type: 'text' },
    category:     { type: 'keyword' },
    subcategory:  { type: 'text', fields: { keyword: { type: 'keyword' } } },
    location:     { type: 'text' },
    tags:         { type: 'text' },
    availability: { type: 'text' },
    price:        { type: 'keyword' },
    createdAt:    { type: 'date' },
    updatedAt:    { type: 'date' },
  },
};

const DISCUSSION_MAPPINGS = {
  properties: {
    id:         { type: 'keyword' },
    title:      { type: 'text', boost: 3 },
    body:       { type: 'text' },
    category:   { type: 'keyword' },
    tags:       { type: 'text' },
    authorName: { type: 'text' },
    createdAt:  { type: 'date' },
    updatedAt:  { type: 'date' },
  },
};

async function ensureIndices(): Promise<void> {
  const client = getClient();
  if (!client) return;

  const specs: [string, typeof LISTING_MAPPINGS | typeof DISCUSSION_MAPPINGS][] = [
    [LISTINGS_INDEX, LISTING_MAPPINGS],
    [DISCUSSIONS_INDEX, DISCUSSION_MAPPINGS],
  ];

  for (const [index, mappings] of specs) {
    try {
      const { statusCode } = await client.indices.exists({ index }, { ignore: [404] }) as ApiResponse & { statusCode: number };
      if (statusCode === 404) {
        await client.indices.create({
          index,
          body: {
            mappings,
            settings: { number_of_shards: 1, number_of_replicas: 0 },
          },
        });
        console.log(`✓ Elasticsearch index created: ${index}`);
      }
    } catch (err) {
      console.warn(`[ES] Could not ensure index "${index}": ${(err as Error).message}`);
    }
  }
}

function listingToDoc(listing: Record<string, unknown>): Record<string, unknown> {
  return {
    id:           listing.id,
    title:        (listing.title as string) || '',
    description:  (listing.description as string) || '',
    category:     (listing.category as string) || '',
    subcategory:  (listing.subcategory as string) || '',
    location:     (listing.location as string) || '',
    tags:         Array.isArray(listing.tags) ? (listing.tags as string[]).join(' ') : '',
    availability: (listing.availability as string) || '',
    price:        (listing.price as string) || '',
    createdAt:    listing.createdAt,
    updatedAt:    listing.updatedAt || listing.createdAt,
  };
}

function discussionToDoc(discussion: Record<string, unknown>): Record<string, unknown> {
  return {
    id:         discussion.id,
    title:      (discussion.title as string) || '',
    body:       (discussion.body as string) || '',
    category:   (discussion.category as string) || '',
    tags:       Array.isArray(discussion.tags) ? (discussion.tags as string[]).join(' ') : '',
    authorName: (discussion.authorName as string) || '',
    createdAt:  discussion.createdAt,
    updatedAt:  discussion.updatedAt || discussion.createdAt,
  };
}

async function indexListing(listing: Record<string, unknown>): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.index({ index: LISTINGS_INDEX, id: listing.id as string, body: listingToDoc(listing) });
  } catch (err) {
    console.warn('[ES] indexListing failed:', (err as Error).message);
  }
}

async function deleteListing(id: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.delete({ index: LISTINGS_INDEX, id }, { ignore: [404] });
  } catch (err) {
    console.warn('[ES] deleteListing failed:', (err as Error).message);
  }
}

interface SearchListingsParams {
  search?: string;
  category?: string;
  subcategory?: string;
  limit?: number;
  skip?: number;
}

interface SearchResult {
  ids: string[];
  total: number;
}

async function searchListings({ search = '', category = '', subcategory = '', limit = 24, skip = 0 }: SearchListingsParams): Promise<SearchResult> {
  const client = getClient();
  if (!client) throw new Error('ES not configured');

  const filters: unknown[] = [];
  if (category && category !== 'all') filters.push({ term: { category } });
  if (subcategory && subcategory !== 'all') filters.push({ match: { subcategory } });

  const query = search
    ? {
        bool: {
          must: [{
            multi_match: {
              query: search,
              fields: ['title^3', 'description', 'subcategory^2', 'location^1.5', 'tags^2', 'availability'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          }],
          filter: filters,
        },
      }
    : filters.length
      ? { bool: { filter: filters } }
      : { match_all: {} };

  const { body: result } = await client.search({
    index: LISTINGS_INDEX,
    body: {
      from: skip,
      size: limit,
      query,
      sort: search
        ? [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }]
        : [{ createdAt: { order: 'desc' } }],
    },
  });

  return {
    ids: result.hits.hits.map((h: { _source: { id: string } }) => h._source.id),
    total: typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total,
  };
}

async function indexDiscussion(discussion: Record<string, unknown>): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.index({ index: DISCUSSIONS_INDEX, id: discussion.id as string, body: discussionToDoc(discussion) });
  } catch (err) {
    console.warn('[ES] indexDiscussion failed:', (err as Error).message);
  }
}

async function deleteDiscussion(id: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.delete({ index: DISCUSSIONS_INDEX, id }, { ignore: [404] });
  } catch (err) {
    console.warn('[ES] deleteDiscussion failed:', (err as Error).message);
  }
}

interface SearchDiscussionsParams {
  search?: string;
  category?: string;
  limit?: number;
  skip?: number;
}

async function searchDiscussions({ search = '', category = '', limit = 25, skip = 0 }: SearchDiscussionsParams): Promise<SearchResult> {
  const client = getClient();
  if (!client) throw new Error('ES not configured');

  const filters: unknown[] = [];
  if (category && category !== 'all') filters.push({ term: { category } });

  const query = search
    ? {
        bool: {
          must: [{
            multi_match: {
              query: search,
              fields: ['title^3', 'body', 'tags^2'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          }],
          filter: filters,
        },
      }
    : filters.length
      ? { bool: { filter: filters } }
      : { match_all: {} };

  const { body: result } = await client.search({
    index: DISCUSSIONS_INDEX,
    body: {
      from: skip,
      size: limit,
      query,
      sort: search
        ? [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }]
        : [{ createdAt: { order: 'desc' } }],
    },
  });

  return {
    ids: result.hits.hits.map((h: { _source: { id: string } }) => h._source.id),
    total: typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total,
  };
}

async function bulkIndexListings(listings: Record<string, unknown>[]): Promise<unknown> {
  const client = getClient();
  if (!client || !listings.length) return;

  const body = listings.flatMap(l => [
    { index: { _index: LISTINGS_INDEX, _id: l.id as string } },
    listingToDoc(l),
  ]);

  const { body: result } = await client.bulk({ body, refresh: true });
  if (result.errors) console.warn('[ES] bulkIndexListings had errors');
  return result;
}

async function bulkIndexDiscussions(discussions: Record<string, unknown>[]): Promise<unknown> {
  const client = getClient();
  if (!client || !discussions.length) return;

  const body = discussions.flatMap(d => [
    { index: { _index: DISCUSSIONS_INDEX, _id: d.id as string } },
    discussionToDoc(d),
  ]);

  const { body: result } = await client.bulk({ body, refresh: true });
  if (result.errors) console.warn('[ES] bulkIndexDiscussions had errors');
  return result;
}

export {
  getClient,
  isAvailable,
  ensureIndices,
  indexListing,
  deleteListing,
  searchListings,
  indexDiscussion,
  deleteDiscussion,
  searchDiscussions,
  bulkIndexListings,
  bulkIndexDiscussions,
  LISTINGS_INDEX,
  DISCUSSIONS_INDEX,
};
