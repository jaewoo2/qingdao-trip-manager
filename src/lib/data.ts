import { z } from 'zod';
import raw from '../data/itinerary.seed.json' with { type: 'json' };

export const placeSchema = z.object({
  ko: z.string().min(1), zh: z.string(), addressZh: z.string().nullable(),
  amapSearch: z.string(), amapPoiId: z.string().nullable(),
  amapPoiIdStatus: z.enum(['unverified', 'verified']),
  coordsGCJ02: z.object({ lon: z.number().min(-180).max(180), lat: z.number().min(-90).max(90) }).nullable(),
  coordsStatus: z.enum(['unverified', 'verified']), sourceAmapUrl: z.string().nullable(),
  note: z.string().nullable(), routeVerifiedOnIPhone: z.boolean(), placeVerified: z.boolean(),
}).strict();
export type Place = z.infer<typeof placeSchema>;
const eventSchema = z.object({
  id: z.string().min(1), timeLabel: z.string(), title: z.string(), type: z.string(),
  placeId: z.string().nullable(), optional: z.boolean(), required: z.boolean(),
  protected: z.boolean(), alternativePlaceIds: z.array(z.string()), notes: z.string().nullable(),
  navigationEligible: z.boolean(),
}).strict();
export type TripEvent = z.infer<typeof eventSchema>;
const seedSchema = z.object({
  schemaVersion: z.literal(1), source: z.string(),
  trip: z.object({
    id: z.string(), title: z.string(), cityZh: z.string(), timezone: z.literal('Asia/Shanghai'),
    startDate: z.string(), endDate: z.string(), adults: z.number(), hotelPlaceId: z.string(),
    outboundFlight: z.object({ number: z.string(), depart: z.string(), arrive: z.string() }),
    returnFlight: z.object({ number: z.string(), depart: z.string(), arrive: z.string() }),
    hotelBreakfastIncluded: z.boolean(), lodgingRooms: z.number(),
  }).strict(),
  rules: z.object({
    mustEatPlaceId: z.string(), mustVisitEventId: z.string(), breakfastEventIds: z.array(z.string()),
    preferredCafePerDay: z.number(), waitingDecision: z.object({ keepUpToMinutes: z.number(), conditionalUntilMinutes: z.number(), switchAfterMinutes: z.number() }),
    bookedRestaurants: z.array(z.string()), unknownPlaceIds: z.array(z.string()), estimatedTransferTimesAreNotRealTimeRoutes: z.boolean(),
  }).strict(),
  places: z.record(z.string(), placeSchema),
  days: z.array(z.object({ date: z.string(), label: z.string(), title: z.string(), events: z.array(eventSchema) }).strict()),
  editorialNote: z.string(),
}).strict().superRefine((seed, ctx) => {
  const ids = new Set<string>();
  for (const day of seed.days) for (const event of day.events) {
    if (ids.has(event.id)) ctx.addIssue({ code: 'custom', message: `Duplicate event: ${event.id}` });
    ids.add(event.id);
    for (const id of [event.placeId, ...event.alternativePlaceIds]) {
      if (id && !Object.hasOwn(seed.places, id)) ctx.addIssue({ code: 'custom', message: `Unknown place: ${id}` });
    }
    if (event.protected && event.alternativePlaceIds.length) ctx.addIssue({ code: 'custom', message: 'Protected event has alternatives' });
  }
  if (!Object.hasOwn(seed.places, seed.rules.mustEatPlaceId) || !ids.has(seed.rules.mustVisitEventId)) ctx.addIssue({ code: 'custom', message: 'Missing required goal' });
});

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); }
  return value;
}
export const seed = freeze(seedSchema.parse(raw));
export const events = seed.days.flatMap(day => day.events);
export const eventById = Object.fromEntries(events.map(event => [event.id, event]));
export { seedSchema };
