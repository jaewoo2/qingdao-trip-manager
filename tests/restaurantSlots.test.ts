import { describe, expect, it } from 'vitest';
import { restaurantCandidates, heldRestaurants } from '../src/data/restaurants';
import { applyRestaurantToSlot, restaurantSlots } from '../src/lib/restaurantSlots';
import { emptyState, importState, selectPlace, toggleCompleted } from '../src/lib/state';

const candidate = (id: string) => restaurantCandidates.find(item => item.id === id)!;
describe('restaurant candidates connect only to canonical meal alternatives', () => {
  it('maps old-town, Wanxiangcheng and Sunday meals without inventing travel distances', () => {
    expect(restaurantSlots(candidate('chunhelou')).map(slot => slot.event.id)).toEqual(['d3-lunch']);
    expect(restaurantSlots(candidate('jiulong')).map(slot => slot.event.id)).toEqual(['d3-lunch']);
    expect(restaurantSlots(candidate('chuange')).map(slot => slot.event.id)).toEqual(['d1-dinner', 'd3-dinner']);
    expect(restaurantSlots(candidate('wanhechun')).map(slot => slot.event.id)).toEqual(['d2-lunch', 'd2-dinner']);
    expect(restaurantSlots(candidate('luyu')).map(slot => slot.event.id)).toEqual(['d1-lunch', 'd3-dinner']);
    expect(restaurantSlots(candidate('chuange'))[0].reason).toContain('같은 완샹청');
  });
  it('blocks unknown branches, unsupported meals, unsupported lunch and airport replacement', () => {
    for (const id of ['kaihai', 'qianhaiyan', 'coucou']) {
      expect(restaurantCandidates.find(item => item.id === id)).toBeUndefined();
      expect(() => applyRestaurantToSlot(emptyState(), id, 'd1-dinner')).toThrow();
    }
    expect(restaurantSlots(heldRestaurants[0])).toEqual([]);
    expect(() => applyRestaurantToSlot(emptyState(), 'meidaer', 'd3-lunch')).toThrow();
    expect(restaurantSlots(candidate('haidilao')).map(slot => slot.event.id)).toEqual(['d1-dinner']);
    for (const [place, event] of [['chunhelou', 'd1-dinner'], ['haidilao', 'd1-lunch'], ['chuange', 'd4-airport'], ['no-place', 'd2-lunch']]) expect(() => applyRestaurantToSlot(emptyState(), place, event)).toThrow();
  });
  it('starts with default meals and persists only the selected Saturday lunch alternative', () => {
    const initial = emptyState();
    expect(initial.selectedPlaceByEventId).toEqual({});
    expect(restaurantSlots(candidate('mingjia')).map(slot => slot.event.id)).toContain('d1-lunch');
    const next = applyRestaurantToSlot(initial, 'mingjia', 'd1-lunch');
    expect(next.selectedPlaceByEventId).toEqual({ 'd1-lunch': 'mingjia' });
    expect(importState(JSON.stringify(next))).toEqual(next);
    expect(selectPlace(next, 'd1-lunch', 'luyu').selectedPlaceByEventId).toEqual({});
  });
  it('replaces only the chosen meal, clears its visit, retains notes and roundtrips the same backup', () => {
    const state = { ...toggleCompleted(emptyState(), 'd2-lunch'), notesByEventId: { 'd2-lunch': '같은 끼니 메모' } };
    const next = applyRestaurantToSlot(state, 'wanhechun', 'd2-lunch');
    expect(next.selectedPlaceByEventId).toEqual({ 'd2-lunch': 'wanhechun' });
    expect(next.notesByEventId['d2-lunch']).toBe('같은 끼니 메모');
    expect(next.completedEventIds).not.toContain('d2-lunch');
    expect(next.requiredGoalAcknowledgements.kaoyuEaten).toBe(false);
    expect(importState(JSON.stringify(next))).toEqual(next);
    expect(selectPlace(next, 'd2-lunch', 'muye').selectedPlaceByEventId).toEqual({});
    expect(applyRestaurantToSlot(next, 'wanhechun', 'd2-lunch')).toBe(next);
  });
});
