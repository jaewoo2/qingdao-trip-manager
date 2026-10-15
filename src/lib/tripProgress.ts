import { seed } from './data';
import type { UserState } from './state';

export function isDayComplete(state: UserState, dayIndex: number): boolean {
  const day = seed.days[dayIndex];
  return Boolean(day && day.events.every(event => state.completedEventIds.includes(event.id)));
}
export function setDayComplete(state: UserState, dayIndex: number, complete: boolean): UserState {
  if (!Number.isInteger(dayIndex) || !seed.days[dayIndex]) throw new Error('알 수 없는 여행 날짜입니다.');
  const ids = seed.days[dayIndex].events.map(event => event.id);
  const completedEventIds = complete ? [...new Set([...state.completedEventIds, ...ids])]
    : state.completedEventIds.filter(id => !ids.includes(id));
  return { ...state, completedEventIds, lastUpdated: new Date().toISOString() };
}
export function eventDayIndex(eventId: string): number {
  return seed.days.findIndex(day => day.events.some(event => event.id === eventId));
}
