import Listing from '../models/Listing';
import type { IListing } from '../types';

function findListingById(id: string) {
  return Listing.findOne({ id });
}

function normalizeListing(listing: IListing | null): Record<string, unknown> | null {
  if (!listing) return null;
  const listingObj = listing.toObject ? listing.toObject() : listing;
  return {
    ...listingObj,
    images: listingObj.images || [],
    tags: listingObj.tags || [],
    comments: (listingObj.comments || []).map((comment: Record<string, unknown>) => ({
      ...(typeof (comment as { toObject?: () => unknown }).toObject === 'function'
        ? (comment as { toObject: () => Record<string, unknown> }).toObject()
        : comment),
      parentId: (comment as { parentId?: string }).parentId || '',
    })),
    commentCount: Array.isArray(listingObj.comments) ? listingObj.comments.length : 0,
  };
}

export {
  findListingById,
  normalizeListing,
};
