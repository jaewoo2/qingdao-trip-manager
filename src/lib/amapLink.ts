import type { Place, TripEvent } from './data';

export type TravelMode = 'walk' | 'drive' | 'transit';
const modes = { drive: '0', transit: '1', walk: '2' } as const;
export function searchLink(place: Place): string | null {
  if (!place.zh.trim() || !place.amapSearch.trim()) return null;
  return `https://uri.amap.com/search?${new URLSearchParams({ keyword: place.amapSearch, city: '青岛', callnative: '1' })}`;
}
export function verifiedCoordinates(place: Place) {
  const c = place.coordsGCJ02;
  return place.coordsStatus === 'verified' && c && Number.isFinite(c.lon) && Number.isFinite(c.lat)
    && Math.abs(c.lon) <= 180 && Math.abs(c.lat) <= 90 ? c : null;
}
export function routeLink(place: Place, mode: TravelMode): string | null {
  if (!place.zh.trim()) return null;
  const query = new URLSearchParams({ sourceApplication: 'QingdaoTripManager', dname: place.zh, t: modes[mode] });
  if (place.amapPoiIdStatus === 'verified' && place.amapPoiId?.trim()) query.set('did', place.amapPoiId.trim());
  else {
    const coords = verifiedCoordinates(place);
    if (!coords) return null;
    query.set('dlat', String(coords.lat)); query.set('dlon', String(coords.lon)); query.set('dev', '0');
  }
  // No slat/slon/sname: the destination app obtains the user's current position.
  return `iosamap://path?${query}`;
}
export function webRouteLink(place: Place, mode: TravelMode): string | null {
  const c = verifiedCoordinates(place);
  if (!c || !place.zh.trim()) return null;
  return `https://uri.amap.com/navigation?${new URLSearchParams({ from: '', to: `${c.lon},${c.lat},${place.zh}`, mode: mode === 'drive' ? 'car' : mode === 'transit' ? 'bus' : 'walk', callnative: '1' })}`;
}
export function navigationLinks(event: Pick<TripEvent, 'navigationEligible' | 'type'>, place: Place, mode: TravelMode) {
  if (!event.navigationEligible || event.type === 'breakfast' || !place.zh.trim()) return null;
  return { route: routeLink(place, mode), webRoute: webRouteLink(place, mode), search: searchLink(place) };
}
