const Listing = require('../models/Listing');

function findListingById(id) {
  return Listing.findOne({ id });
}

function normalizeListing(listing) {
  if (!listing) return null;
  const listingObj = listing.toObject ? listing.toObject() : listing;
  return {
    ...listingObj,
    images: listingObj.images || [],
    tags: listingObj.tags || [],
    comments: (listingObj.comments || []).map(comment => ({
      ...(comment.toObject ? comment.toObject() : comment),
      parentId: comment.parentId || '',
    })),
    commentCount: Array.isArray(listingObj.comments) ? listingObj.comments.length : 0,
  };
}

module.exports = {
  findListingById,
  normalizeListing,
};
