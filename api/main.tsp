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

model EventType {
  @pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
  id: string;

  @pattern("\\S")
  title: string;

  @pattern("\\S")
  description: string;

  @minValue(1)
  durationMinutes: integer;
}

@get
@route("/api/event-types")
@operationId("listEventTypes")
op listEventTypes(): EventType[];
