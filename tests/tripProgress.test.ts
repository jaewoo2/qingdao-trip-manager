import { describe, expect, it } from 'vitest';
import { seed } from '../src/lib/data';
import { emptyState, importState, selectPlace, toggleCompleted } from '../src/lib/state';
import { isDayComplete, setDayComplete } from '../src/lib/tripProgress';
import { restaurantDayStatus } from '../src/lib/restaurantSlots';
import { restaurantCandidates } from '../src/data/restaurants';

const candidate = (id: string) => restaurantCandidates.find(item => item.id === id)!;
describe('day completion and restaurant lifecycle', () => {
  it('completes only one day, retains edits and meal acknowledgements, supports backup and undo', () => {
    const initial = { ...selectPlace(emptyState(), 'd1-lunch', 'mingjia'), notesByEventId: { 'd1-lunch': '딤섬 선택' }, completedEventIds: ['d2-lunch'] };
    const completed = setDayComplete(initial, 0, true);
    expect(isDayComplete(completed, 0)).toBe(true);
    expect(isDayComplete(completed, 1)).toBe(false);
    expect(completed.selectedPlaceByEventId).toEqual(initial.selectedPlaceByEventId);
    expect(completed.notesByEventId).toEqual(initial.notesByEventId);
    expect(completed.requiredGoalAcknowledgements).toEqual(initial.requiredGoalAcknowledgements);
    expect(importState(JSON.stringify(completed))).toEqual(completed);
    expect(setDayComplete(completed, 0, false).completedEventIds).toEqual(['d2-lunch']);
    expect(setDayComplete(completed, 0, true).completedEventIds).toHaveLength(seed.days[0].events.length + 1);
    expect(() => setDayComplete(initial, 9, true)).toThrow();
  });
  it('detects individual checks, archives exclusive candidates, keeps shared candidates for later meals', () => {
    let state = emptyState();
    for (const event of seed.days[0].events) state = toggleCompleted(state, event.id);
    expect(isDayComplete(state, 0)).toBe(true);
    expect(restaurantDayStatus(candidate('haidilao'), state)).toEqual({ activeDays: [], completedDays: [0] });
    expect(restaurantDayStatus(candidate('luyu'), state)).toEqual({ activeDays: [2], completedDays: [0] });
    expect(restaurantDayStatus(candidate('mingjia'), state)).toEqual({ activeDays: [2], completedDays: [0] });
    expect(isDayComplete(toggleCompleted(state, 'd1-lunch'), 0)).toBe(false);
    const reopened = selectPlace(state, 'd1-lunch', 'mingjia');
    expect(restaurantDayStatus(candidate('haidilao'), reopened)).toEqual({ activeDays: [0], completedDays: [] });
  });
});
