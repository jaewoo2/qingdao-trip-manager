import { restaurantCandidates, type RestaurantCandidate } from '../data/restaurants';
import { seed, type TripEvent } from './data';
import { places, plannedEvent } from './tripPlan';
import { eventDayIndex, isDayComplete } from './tripProgress';
import { selectPlace, type UserState } from './state';

export type RestaurantSlot = { event: TripEvent; dayLabel: string; label: string; reason: string };

export function restaurantSlots(candidate: RestaurantCandidate): RestaurantSlot[] {
  if (candidate.status !== 'active' || !candidate.place.addressZh) return [];
  return seed.days.flatMap((day, index) => day.events.map(plannedEvent).filter(event => event.type === 'meal'
    && [event.placeId, ...event.alternativePlaceIds].includes(candidate.id)).map(event => {
    const original = event.placeId ? places[event.placeId] : null;
    const sameMall = [original?.addressZh, candidate.place.addressZh].every(address => address?.includes('万象城'));
    const reason = candidate.id === 'haidilao' ? '인쭤광장점은 완샹청 밖 · 별도 이동과 영업시간 확인 필요' : sameMall ? '같은 완샹청의 식사 후보 · 실제 층·지점은 확인 필요'
      : event.id === 'd3-lunch' ? '중산로·다구루 구도심 식사에 등록된 대안 · 실제 도보 거리 미검증'
      : '원본 일정에 등록된 식사 대안 · 실제 이동 거리·시간 미검증';
    return { event, dayLabel: `DAY ${index + 1} · ${day.label}`, label: `DAY ${index + 1} · ${day.label} ${event.id.endsWith('lunch') ? '점심' : '저녁'}`, reason };
  }));
}

export function applyRestaurantToSlot(state: UserState, candidateId: string, eventId: string): UserState {
  const candidate = restaurantCandidates.find(item => item.id === candidateId);
  const slot = candidate && restaurantSlots(candidate).find(item => item.event.id === eventId);
  if (!candidate || !slot || slot.event.protected) throw new Error('이 식당으로 교체할 수 없는 일정입니다.');
  return selectPlace(state, eventId, candidate.id);
}

export function restaurantDayStatus(candidate: RestaurantCandidate, state: UserState) {
  const days = [...new Set(restaurantSlots(candidate).map(slot => eventDayIndex(slot.event.id)))].filter(index => index >= 0);
  return {
    activeDays: days.filter(index => !isDayComplete(state, index)),
    completedDays: days.filter(index => isDayComplete(state, index)),
  };
}
