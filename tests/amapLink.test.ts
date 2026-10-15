import { describe, expect, it } from 'vitest';
import { seed } from '../src/lib/data';
import { navigationLinks, routeLink, searchLink, webRouteLink } from '../src/lib/amapLink';

// Synthetic values exercise serialization only; these are NOT destination coordinates or POIs.
const fixture = { ...seed.places.hotel, zh: '测试 & % 地点', amapPoiId: 'TEST_ONLY', amapPoiIdStatus: 'verified' as const };
describe('WP-0: conservative AMap adapter', () => {
  it('leaves every unverified seed destination on search fallback', () => {
    for (const place of Object.values(seed.places)) expect(routeLink(place, 'walk')).toBeNull();
    expect(new URL(searchLink(seed.places.wanhechun)!).searchParams.get('keyword')).toBe(seed.places.wanhechun.amapSearch);
  });
  it.each([['drive', '0'], ['transit', '1'], ['walk', '2']] as const)('encodes %s and omits all current-position parameters', (mode, t) => {
    const url = new URL(routeLink(fixture, mode)!);
    expect(url.protocol).toBe('iosamap:'); expect(url.hostname).toBe('path');
    expect(url.searchParams.get('did')).toBe('TEST_ONLY'); expect(url.searchParams.get('dname')).toBe(fixture.zh);
    expect(url.searchParams.get('sourceApplication')).toBe('QingdaoTripManager'); expect(url.searchParams.get('t')).toBe(t);
    for (const key of ['slat', 'slon', 'sname']) expect(url.searchParams.has(key)).toBe(false);
  });
  it('keeps coordinate order correct in each protocol', () => {
    const place = { ...fixture, amapPoiIdStatus: 'unverified' as const, coordsStatus: 'verified' as const, coordsGCJ02: { lat: 1, lon: 2 } };
    const ios = new URL(routeLink(place, 'walk')!);
    expect(ios.searchParams.get('dlat')).toBe('1'); expect(ios.searchParams.get('dlon')).toBe('2'); expect(ios.searchParams.get('dev')).toBe('0');
    expect(new URL(webRouteLink(place, 'walk')!).searchParams.get('to')).toBe(`2,1,${place.zh}`);
    expect(routeLink({ ...place, coordsGCJ02: { lat: NaN, lon: 2 } }, 'walk')).toBeNull();
  });
  it('never routes or searches unknown beer; hides breakfast and resting navigation', () => {
    expect(searchLink(seed.places.beer_unknown)).toBeNull();
    expect(routeLink({ ...fixture, zh: '' }, 'walk')).toBeNull();
    expect(navigationLinks({ type: 'breakfast', navigationEligible: true }, fixture, 'walk')).toBeNull();
    expect(navigationLinks({ type: 'hotel', navigationEligible: false }, fixture, 'walk')).toBeNull();
  });
});
