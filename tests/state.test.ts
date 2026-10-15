import { describe, expect, it } from 'vitest';
import { events, seed, seedSchema } from '../src/lib/data';
import { eventById } from '../src/lib/data';
import { emptyState, importState, loadState, MAX_BACKUP_BYTES, parseState, saveState, selectedPlaceId, selectPlace, toggleCompleted, togglePacking } from '../src/lib/state';

describe('WP-1: canonical seed integrity', () => {
  it('preserves all days, events and place records', () => {
    expect(seed.days).toHaveLength(4); expect(events).toHaveLength(35); expect(Object.keys(seed.places)).toHaveLength(32);
    expect(new Set(events.map(e => e.id)).size).toBe(35); expect(seedSchema.safeParse(seed).success).toBe(true);
    expect(Object.isFrozen(seed.places.hotel)).toBe(true);
    expect(seed.trip.timezone).toBe('Asia/Shanghai');
  });
  it('protects breakfast, kaoyu and Monday beach without fabricating confirmations', () => {
    expect(events.filter(e => e.type === 'breakfast').map(e => e.id)).toEqual(seed.rules.breakfastEventIds);
    for (const id of seed.rules.breakfastEventIds) expect(eventById[id].navigationEligible).toBe(false);
    expect(eventById['d1-lunch'].protected).toBe(true); expect(eventById['d3-beach'].protected).toBe(true);
    for (const place of Object.values(seed.places)) {
      expect(place.amapPoiId).toBeNull(); expect(place.coordsGCJ02).toBeNull(); expect(place.routeVerifiedOnIPhone).toBe(false);
    }
  });
});
describe('WP-2: local overrides and safe recovery', () => {
  it('replaces and restores only the selected event, never the seed', () => {
    const state = selectPlace(emptyState(), 'd2-lunch', 'wanhechun');
    expect(selectedPlaceId(eventById['d2-lunch'], state)).toBe('wanhechun');
    expect(selectedPlaceId(eventById['d2-dinner'], state)).toBe('forest');
    expect(eventById['d2-lunch'].placeId).toBe('muye');
    expect(selectPlace(state, 'd2-lunch', 'muye').selectedPlaceByEventId).toEqual({});
  });
  it('rejects unknown IDs, prototype keys, disallowed alternatives and protected replacements', () => {
    for (const [event, place] of [['d3-beach', 'hotel'], ['d1-lunch', 'haidilao'], ['d2-lunch', 'hotel'], ['bad', 'hotel'], ['__proto__', 'hotel'], ['d2-lunch', '__proto__']]) expect(() => selectPlace(emptyState(), event, place)).toThrow();
  });
  it('does not credit kaoyu when alternatives or completion change; clears stale visit after a switch', () => {
    const state = toggleCompleted(selectPlace(emptyState(), 'd3-dinner', 'luyu'), 'd3-dinner');
    expect(state.requiredGoalAcknowledgements.kaoyuEaten).toBe(false);
    const next = selectPlace(state, 'd3-dinner', 'mingjia');
    expect(next.completedEventIds).not.toContain('d3-dinner'); expect(next.requiredGoalAcknowledgements.kaoyuEaten).toBe(false);
  });
  it('roundtrips a backup with notes and explicit kaoyu acknowledgement', () => {
    const state = { ...selectPlace(emptyState(), 'd2-lunch', 'wanhechun'), notesByEventId: { 'd2-lunch': '대기 후 변경' }, requiredGoalAcknowledgements: { kaoyuEaten: true } };
    let raw = '';
    saveState({ setItem: (_key, value) => { raw = value; } }, state);
    expect(loadState({ getItem: () => raw }).state).toEqual(state);
    expect(importState(raw)).toEqual(state);
  });
  it.each([
    { schemaVersion: 2 }, { tripId: 'another-trip' }, { selectedPlaceByEventId: { 'd3-beach': 'hotel' } },
    { selectedPlaceByEventId: { 'd2-lunch': 'hotel' } }, { notesByEventId: { unknown: 'x' } },
    { completedEventIds: ['unknown'] }, { completedEventIds: ['d2-lunch', 'd2-lunch'] },
    { notesByEventId: { 'd2-lunch': 'x'.repeat(2001) } }, { extra: true }, { lastUpdated: 'tomorrow' },
  ])('rejects malformed or unsafe import %j', patch => {
    const state = emptyState(); expect(() => parseState({ ...state, ...patch })).toThrow(); expect(state.selectedPlaceByEventId).toEqual({});
  });
  it('preserves corrupt storage and propagates denied writes', () => {
    const loaded = loadState({ getItem: () => '{corrupt' });
    expect(loaded.locked).toBe(true); expect(loaded.raw).toBe('{corrupt');
    expect(() => saveState({ setItem: () => { throw new Error('QuotaExceeded'); } }, emptyState())).toThrow('QuotaExceeded');
    expect(() => importState('x'.repeat(MAX_BACKUP_BYTES + 1))).toThrow();
  });
  it('can reimport a valid backup with the maximum notes even when JSON escaping expands the file', () => {
    const state = { ...emptyState(), notesByEventId: Object.fromEntries(events.map(event => [event.id, '\u0000'.repeat(2000)])) };
    const text = JSON.stringify(state);
    expect(new TextEncoder().encode(text).byteLength).toBeLessThan(MAX_BACKUP_BYTES);
    expect(importState(text)).toEqual(state);
  });
});


describe('packing state migration and backup', () => {
  it('reads earlier v1 backups without losing itinerary edits', () => {
    const legacy = { ...selectPlace(emptyState(), 'd2-lunch', 'wanhechun'), notesByEventId: { 'd2-lunch': '기존 메모' } };
    const { packingCheckedIds: _packing, ...withoutPacking } = legacy;
    expect(_packing).toEqual([]);
    const loaded = importState(JSON.stringify(withoutPacking));
    expect(loaded.packingCheckedIds).toEqual([]);
    expect(loaded.selectedPlaceByEventId['d2-lunch']).toBe('wanhechun');
    expect(loaded.notesByEventId['d2-lunch']).toBe('기존 메모');
  });
  it('roundtrips packing checks alongside edits and rejects invalid packing IDs', () => {
    const state = togglePacking(selectPlace(emptyState(), 'd2-lunch', 'wanhechun'), 'passport');
    expect(importState(JSON.stringify(state))).toEqual(state);
    expect(togglePacking(state, 'passport').packingCheckedIds).toEqual([]);
    expect(() => togglePacking(state, 'made-up')).toThrow();
    for (const ids of [['made-up'], ['passport', 'passport']]) expect(() => parseState({ ...state, packingCheckedIds: ids })).toThrow();
  });
});

describe('revised meal plan and legacy visit preservation', () => {
  it('uses Chunhelou as Monday lunch without mutating the seed', () => {
    expect(eventById['d3-lunch'].placeId).toBe('meidaer');
    expect(selectedPlaceId(eventById['d3-lunch'], emptyState())).toBe('jiulong');
    expect(selectPlace(emptyState(), 'd3-lunch', 'chunhelou').selectedPlaceByEventId['d3-lunch']).toBe('chunhelou');
    expect(() => selectPlace(emptyState(), 'd3-lunch', 'meidaer')).toThrow();
  });
  it('keeps the original visited restaurant in old backups instead of crediting a new default', () => {
    const { mealPlanVersion: _version, ...legacy } = { ...toggleCompleted(emptyState(), 'd3-lunch'), notesByEventId: { 'd3-lunch': '예전에 방문한 메모' }, packingCheckedIds: ['passport'] };
    expect(_version).toBe(2);
    const loaded = importState(JSON.stringify(legacy));
    expect(selectedPlaceId(eventById['d3-lunch'], loaded)).toBe('meidaer');
    expect(loaded.completedEventIds).toContain('d3-lunch');
    expect(loaded.notesByEventId['d3-lunch']).toBe('예전에 방문한 메모');
    expect(loaded.packingCheckedIds).toContain('passport');
    expect(importState(JSON.stringify(loaded))).toEqual(loaded);
  });
  it('keeps old explicit choices and notes, including Sunday alternatives removed from the new picker', () => {
    const { mealPlanVersion: _version, ...legacy } = emptyState();
    expect(_version).toBe(2);
    const loaded = importState(JSON.stringify({ ...legacy, selectedPlaceByEventId: { 'd2-lunch': 'naxienian', 'd3-lunch': 'jiulong' } }));
    expect(loaded.selectedPlaceByEventId).toEqual({ 'd2-lunch': 'naxienian', 'd3-lunch': 'jiulong' });
    expect(() => selectPlace(emptyState(), 'd2-lunch', 'naxienian')).toThrow();
    const haidilao = selectPlace(emptyState(), 'd1-dinner', 'haidilao');
    expect(importState(JSON.stringify(haidilao))).toEqual(haidilao);
  });
});
