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
  };
}

module.exports = {
  findListingById,
  normalizeListing,
};
