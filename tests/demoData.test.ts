import { expect, it } from 'vitest';
import { seed } from '../src/lib/data';
import { emptyState } from '../src/lib/state';

it('ships example booking data and never marks map identities as verified', () => {
  expect(seed.source).toContain('예시');
  expect(seed.trip.id).toBe('qingdao-demo');
  expect(seed.trip.startDate.startsWith('2030-')).toBe(true);
  expect(seed.places.hotel.addressZh).toBeNull();
  expect(seed.places.hotel.amapSearch).toBe('');
  expect(seed.places.hotel.sourceAmapUrl).toBeNull();
  expect(seed.trip.outboundFlight.depart).toContain('입력 전');
  expect(seed.trip.returnFlight.number).toContain('예시');
  expect(emptyState().selectedPlaceByEventId).toEqual({});
  for (const place of Object.values(seed.places)) {
    expect(place.amapPoiId).toBeNull();
    expect(place.coordsGCJ02).toBeNull();
    expect(place.routeVerifiedOnIPhone).toBe(false);
  }
});
