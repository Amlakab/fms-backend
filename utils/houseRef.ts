import mongoose from 'mongoose';

/**
 * Stable shape returned to the frontend when a populated `houseId`
 * reference points at a house that no longer exists.
 *
 * Purpose: keep the API contract stable so frontend code that reads
 * `house.title`, `house.location.city`, `house.pricing.price`, etc.
 * never crashes on `null`.
 */
export const DELETED_HOUSE_STUB = {
  _id: null,
  title: '(Deleted property)',
  description: '',
  propertyType: null as string | null,
  transactionType: null as string | null,
  intendedPurpose: null as string | null,
  status: 'UNAVAILABLE',
  approvalStatus: null as string | null,
  verificationStatus: null as string | null,
  isVerified: false,
  location: {
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    neighborhood: '',
    coordinates: { lat: 0, lng: 0 },
  },
  details: {
    bedrooms: 0,
    bathrooms: 0,
    area: 0,
    lotSize: 0,
    yearBuilt: 0,
    floors: 0,
    parkingSpaces: 0,
    furnished: false,
    amenities: [] as string[],
    features: [] as string[],
  },
  pricing: {
    price: 0,
    pricePerSqft: 0,
    maintenanceFee: 0,
    taxAmount: 0,
    securityDeposit: 0,
    quantity: 0,
  },
  images: [] as any[],
  threeDModels: [] as any[],
  ownerId: null as any,
  agentId: null as any,
  agentName: '',
  agentContact: '',
  isDeleted: true,
};

/**
 * Replaces every `null` populated house reference with DELETED_HOUSE_STUB.
 * Works on plain objects (from `.lean()`) and on Mongoose docs (via `.toObject()`).
 *
 * Usage (backend only — no frontend change needed):
 *
 *   const raw = await Appointment.find(filter)
 *     .populate('houseId', 'title location pricing images')
 *     .lean();
 *   const appointments = hydrateHouseRefs(raw);
 *
 *   // or with documents:
 *   const docs = await Appointment.find(filter).populate('houseId', '...');
 *   const hydrated = hydrateHouseRefs(docs.map((d) => d.toObject()));
 */
export function hydrateHouseRefs<T extends Record<string, any>>(
  docs: T | T[],
  refField: string = 'houseId'
): T | T[] {
  const patch = (doc: any) => {
    if (!doc) return doc;
    const ref = doc[refField];

    // populate resolved to null → house was deleted (or never existed)
    if (ref === null || ref === undefined) {
      return { ...doc, [refField]: { ...DELETED_HOUSE_STUB } };
    }

    // populate returned a raw ObjectId/string → caller forgot to populate
    // (still guarantee the API never sends a bare id to the UI)
    if (
      typeof ref === 'string' ||
      ref instanceof mongoose.Types.ObjectId
    ) {
      return {
        ...doc,
        [refField]: { ...DELETED_HOUSE_STUB, _id: ref },
      };
    }

    return doc;
  };

  return Array.isArray(docs) ? (docs.map(patch) as T[]) : (patch(docs) as T);
}