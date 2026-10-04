export type GeoLookupResult = {
  city: string;
  state: string;
  lat: number;
  lng: number;
};

/**
 * Port for zip → city/state/lat/lng lookup.
 * Implementations must fail soft (return null) rather than throw for bad zips.
 */
export interface GeoLookupAdapter {
  lookupUsZip(zip: string): Promise<GeoLookupResult | null>;
}
