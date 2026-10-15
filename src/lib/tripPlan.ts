import { seed, type Place, type TripEvent } from './data';

// Reviewed user-supplied research, 2026-10-15. Keep the canonical seed unchanged.
// Source links do not verify coordinates, POI identity or iPhone route behavior.
export const places: Record<string, Place> = { ...seed.places };
const updates: Record<string, Partial<Place>> = {
  luyu: { note: '토요일 점심 기본 식당 · 명가딤섬으로 변경할 수 있어요.', zh: '炉鱼(青岛万象城店)', addressZh: '山东路6号万象城5层L511' },
  pingjie: { zh: '萍姐火锅·公路夜市(青岛万象城店)', addressZh: '山东路6号甲青岛万象城B1层B123室' },
  chuange: { zh: '船歌·鱼水饺青岛菜(万象城店)', addressZh: '山东路6号甲青岛万象城B1层B127室' },
  mingjia: { addressZh: '山东路6号万象城一期5楼L502' },
  forest: { addressZh: '市北区丹阳路68号' },
  muye: { zh: '牧野石歌羊肉串·活烤海鲜(延吉路店)' },
  chunhelou: { sourceAmapUrl: 'https://www.amap.com/place/B0LGV4SLXX' },
  jiulong: { zh: '九龙餐厅(大沽路老店)', sourceAmapUrl: 'https://ditu.amap.com/place/B0FFFY629P' },
  wanhechun: { sourceAmapUrl: 'https://www.amap.com/place/B0FFFRR5R3' },
};
for (const [id, patch] of Object.entries(updates)) places[id] = { ...places[id], ...patch };
places.haidilao = {
  ko: '하이디라오 · 인쭤광장점', zh: '海底捞火锅(银座广场店)', addressZh: '香港中路31号银座中心6楼',
  amapSearch: '青岛 海底捞 银座广场店', amapPoiId: null, amapPoiIdStatus: 'unverified', coordsGCJ02: null,
  coordsStatus: 'unverified', sourceAmapUrl: 'https://www.amap.com/place/B0FFHWI5KF', note: null,
  routeVerifiedOnIPhone: false, placeVerified: false,
};
const planUpdates: Record<string, Partial<TripEvent>> = {
  'd1-lunch': { title: '루위 · 카오위 점심', required: false, protected: false, alternativePlaceIds: ['mingjia'], notes: '완샹청에서 점심. 명가딤섬을 선택해도 다른 끼니는 바뀌지 않아요.' },
  'd1-dinner': { alternativePlaceIds: ['mingjia', 'haidilao', 'chuange'] },
  'd2-lunch': { alternativePlaceIds: ['wanhechun'] },
  'd2-dinner': { alternativePlaceIds: ['wanhechun'] },
  'd3-lunch': { placeId: 'jiulong', title: '구룡식당 점심 예시', alternativePlaceIds: ['chunhelou'], notes: '기능 시연용 점심 예시. 춘화루로 교체할 수 있습니다.' },
};
export function plannedEvent(event: TripEvent): TripEvent { return { ...event, ...planUpdates[event.id] }; }
export function legacyAndCurrentPlaces(event: TripEvent): string[] {
  const current = plannedEvent(event);
  return [event.placeId, ...event.alternativePlaceIds, current.placeId, ...current.alternativePlaceIds].filter((id): id is string => Boolean(id));
}
