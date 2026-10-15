import { z } from 'zod';
import { legacyAndCurrentPlaces, places, plannedEvent } from './tripPlan';
import { packingItemIds } from '../data/packing';
import { eventById, type TripEvent } from './data';

export const STORAGE_KEY = 'qingdao-trip-manager-demo-v1';
export const DAY_KEY = 'qingdao-trip-manager-demo-day';
export const MAX_BACKUP_BYTES = 512 * 1024;
const own = (o: object, key: string) => Object.hasOwn(o, key);
const userStateSchema = z.object({
  mealPlanVersion: z.literal(2).default(2),
  schemaVersion: z.literal(1), tripId: z.literal('qingdao-demo'),
  selectedPlaceByEventId: z.record(z.string(), z.string()),
  completedEventIds: z.array(z.string()).max(35),
  packingCheckedIds: z.array(z.string()).max(packingItemIds.length).default([]),
  notesByEventId: z.record(z.string(), z.string().max(2000)),
  requiredGoalAcknowledgements: z.object({ kaoyuEaten: z.boolean() }).strict(),
  lastUpdated: z.iso.datetime(),
}).strict().superRefine((state, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  for (const [id, placeId] of Object.entries(state.selectedPlaceByEventId)) {
    if (!own(eventById, id)) { issue(`알 수 없는 일정: ${id}`); continue; }
    const event = plannedEvent(eventById[id]);
    if (event.protected && placeId !== event.placeId) issue(`보호된 일정: ${id}`);
    if (!own(places, placeId) || !legacyAndCurrentPlaces(eventById[id]).includes(placeId)) issue(`허용되지 않은 대안: ${id}`);
  }
  for (const id of [...state.completedEventIds, ...Object.keys(state.notesByEventId)]) if (!own(eventById, id)) issue(`알 수 없는 일정: ${id}`);
  if (state.packingCheckedIds.some(id => !packingItemIds.includes(id)) || new Set(state.packingCheckedIds).size !== state.packingCheckedIds.length) issue('알 수 없거나 중복된 준비물');
  if (new Set(state.completedEventIds).size !== state.completedEventIds.length) issue('완료 일정 중복');
});
export type UserState = z.infer<typeof userStateSchema>;
export const emptyState = (): UserState => ({
  mealPlanVersion: 2, schemaVersion: 1, tripId: 'qingdao-demo', selectedPlaceByEventId: {}, completedEventIds: [],
  packingCheckedIds: [], notesByEventId: {}, requiredGoalAcknowledgements: { kaoyuEaten: false }, lastUpdated: new Date().toISOString(),
});
export function parseState(input: unknown): UserState {
  const state = userStateSchema.parse(input);
  // A completed visit in a legacy backup refers to Meidaer, not the new default.
  if (input && typeof input === 'object' && !Object.hasOwn(input, 'mealPlanVersion')
    && state.completedEventIds.includes('d3-lunch') && !Object.hasOwn(state.selectedPlaceByEventId, 'd3-lunch')) {
    state.selectedPlaceByEventId = { ...state.selectedPlaceByEventId, 'd3-lunch': 'meidaer' };
  }
  return state;
}
export function importState(text: string): UserState {
  if (text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('백업은 512KiB 이하여야 합니다.');
  return parseState(JSON.parse(text));
}
export function selectedPlaceId(event: TripEvent, state: UserState) {
  return state.selectedPlaceByEventId[event.id] ?? plannedEvent(event).placeId;
}
export function selectPlace(state: UserState, eventId: string, placeId: string): UserState {
  if (!own(eventById, eventId)) throw new Error('알 수 없는 일정입니다.');
  const event = plannedEvent(eventById[eventId]);
  if (!own(places, placeId) || (event.protected && placeId !== event.placeId) || ![event.placeId, ...event.alternativePlaceIds].includes(placeId)) throw new Error('허용되지 않은 대안입니다.');
  if (selectedPlaceId(event, state) === placeId) return state;
  const overrides = { ...state.selectedPlaceByEventId };
  if (placeId === event.placeId) delete overrides[eventId]; else overrides[eventId] = placeId;
  return { ...state, selectedPlaceByEventId: overrides, completedEventIds: state.completedEventIds.filter(id => id !== eventId), lastUpdated: new Date().toISOString() };
}
export function toggleCompleted(state: UserState, id: string): UserState {
  if (!own(eventById, id)) throw new Error('알 수 없는 일정입니다.');
  return { ...state, completedEventIds: state.completedEventIds.includes(id) ? state.completedEventIds.filter(v => v !== id) : [...state.completedEventIds, id], lastUpdated: new Date().toISOString() };
}
export function togglePacking(state: UserState, id: string): UserState {
  if (!packingItemIds.includes(id)) throw new Error('알 수 없는 준비물입니다.');
  return { ...state, packingCheckedIds: state.packingCheckedIds.includes(id) ? state.packingCheckedIds.filter(item => item !== id) : [...state.packingCheckedIds, id], lastUpdated: new Date().toISOString() };
}
export function loadState(storage: Pick<Storage, 'getItem'>): { state: UserState; error: string | null; locked: boolean; raw: string | null } {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    return { state: raw ? importState(raw) : emptyState(), error: null, locked: false, raw };
  } catch {
    return { state: emptyState(), error: '기존 저장 데이터를 읽지 못했습니다. 원본 데이터는 덮어쓰지 않았습니다. 백업을 복원하거나 원본으로 초기화하세요.', locked: true, raw };
  }
}
export function saveState(storage: Pick<Storage, 'setItem'>, state: UserState) {
  storage.setItem(STORAGE_KEY, JSON.stringify(parseState(state)));
}
