import "@typespec/http";
import "@typespec/openapi";

using Http;
using OpenAPI;

@service(#{ title: "Календарь звонков" })
namespace CallCalendar;

model Health {
  status: "ok";
}

@get
@route("/api/health")
@operationId("getHealth")
op getHealth(): Health;

@pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
scalar EventTypeId extends string;

model EventType {
  id: EventTypeId;

  @pattern("\\S")
  title: string;

  @pattern("\\S")
  description: string;

  @minValue(1)
  @maxValue(9007199254740991)
  durationMinutes: safeint;
}

@get
@route("/api/event-types")
@operationId("listEventTypes")
op listEventTypes(): EventType[];

model EventTypeCreated {
  @statusCode statusCode: 201;
  @body body: EventType;
}

@error
model InvalidEventTypeInput {
  @statusCode statusCode: 400;
  @body body: {
    code: "INVALID_INPUT";
    message: string;
  };
}

@error
model EventTypeIdTaken {
  @statusCode statusCode: 409;
  @body body: {
    code: "EVENT_TYPE_ID_TAKEN";
    message: string;
  };
}

@post
@route("/api/event-types")
@operationId("createEventType")
op createEventType(@body eventType: EventType): EventTypeCreated | InvalidEventTypeInput | EventTypeIdTaken;

model Slot {
  startAt: utcDateTime;
  endAt: utcDateTime;
}

model AvailabilityDay {
  date: plainDate;
  slots: Slot[];
}

model AvailabilityCalendar {
  timezone: "Asia/Tbilisi";
  @minItems(14)
  @maxItems(14)
  days: AvailabilityDay[];
}

@error
model EventTypeNotFound {
  @statusCode statusCode: 404;
  @body body: {
    code: "EVENT_TYPE_NOT_FOUND";
    message: string;
  };
}

@get
@route("/api/event-types/{id}/slots")
@operationId("listSlots")
op listSlots(@path id: string): AvailabilityCalendar | EventTypeNotFound;

model Booking {
  id: string;
  eventTypeId: string;
  eventTypeTitle: string;
  startAt: utcDateTime;
  endAt: utcDateTime;
  guestName: string;
}

model BookingRequest {
  eventTypeId: EventTypeId;
  startAt: utcDateTime;
  @pattern("\\S")
  guestName: string;
}

model BookingCreated {
  @statusCode statusCode: 201;
  @body body: Booking;
}

@error
model InvalidBookingInput {
  @statusCode statusCode: 400;
  @body body: {
    code: "INVALID_INPUT";
    message: string;
  };
}

@error
model SlotTaken {
  @statusCode statusCode: 409;
  @body body: {
    code: "SLOT_TAKEN";
    message: string;
  };
}

@post
@route("/api/bookings")
@operationId("createBooking")
op createBooking(@body booking: BookingRequest): BookingCreated | InvalidBookingInput | EventTypeNotFound | SlotTaken;

@get
@route("/api/bookings/upcoming")
@operationId("listUpcomingBookings")
op listUpcomingBookings(): Booking[];
