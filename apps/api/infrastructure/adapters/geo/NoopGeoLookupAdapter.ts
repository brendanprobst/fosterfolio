import type {
  GeoLookupAdapter,
  GeoLookupResult,
} from '@api/infrastructure/adapters/geo/GeoLookupAdapter';

/** Test / offline stub — never resolves geo. */
export class NoopGeoLookupAdapter implements GeoLookupAdapter {
  async lookupUsZip(_zip: string): Promise<GeoLookupResult | null> {
    return null;
  }
}
