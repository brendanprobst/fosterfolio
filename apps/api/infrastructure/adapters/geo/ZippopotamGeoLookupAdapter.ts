import type {
  GeoLookupAdapter,
  GeoLookupResult,
} from '@api/infrastructure/adapters/geo/GeoLookupAdapter';
import { Logger } from '@api/utils/logger';

type ZippopotamResponse = {
  'post code'?: string;
  places?: Array<{
    'place name'?: string;
    'state abbreviation'?: string;
    latitude?: string;
    longitude?: string;
  }>;
};

/**
 * Free US zip lookup via api.zippopotam.us. No API key.
 * Returns null on network/404/parse failures so profile saves still succeed.
 */
export class ZippopotamGeoLookupAdapter implements GeoLookupAdapter {
  async lookupUsZip(zip: string): Promise<GeoLookupResult | null> {
    const cleaned = zip.trim();
    if (!/^\d{5}(-\d{4})?$/.test(cleaned)) {
      return null;
    }
    const five = cleaned.slice(0, 5);

    try {
      const response = await fetch(`https://api.zippopotam.us/us/${five}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as ZippopotamResponse;
      const place = body.places?.[0];
      if (!place?.['place name'] || !place['state abbreviation']) {
        return null;
      }
      const lat = Number(place.latitude);
      const lng = Number(place.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }
      return {
        city: place['place name'],
        state: place['state abbreviation'],
        lat,
        lng,
      };
    } catch (error) {
      Logger.warning(
        `[geo] zip lookup failed (${error instanceof Error ? error.message : 'unknown'})`,
      );
      return null;
    }
  }
}
