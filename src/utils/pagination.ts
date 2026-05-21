interface PaginationDefaults {
  defaultLimit?: number;
  maxLimit?: number;
}

interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  [key: string]: unknown;
}

interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

function getPagination(query: PaginationQuery = {}, defaults: PaginationDefaults = {}): Pagination {
  const defaultLimit = defaults.defaultLimit || 20;
  const maxLimit = defaults.maxLimit || 100;
  const page = Math.max(1, Number.parseInt(String(query.page), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(String(query.limit), 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function pagedResponse(key: string, items: unknown[], total: number, page: number, limit: number): Record<string, unknown> {
  return {
    [key]: items,
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  };
}

export { getPagination, pagedResponse };
