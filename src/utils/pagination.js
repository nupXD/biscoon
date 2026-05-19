function getPagination(query = {}, defaults = {}) {
  const defaultLimit = defaults.defaultLimit || 20;
  const maxLimit = defaults.maxLimit || 100;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function pagedResponse(key, items, total, page, limit) {
  return {
    [key]: items,
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  };
}

module.exports = { getPagination, pagedResponse };
