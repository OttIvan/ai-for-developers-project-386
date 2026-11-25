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
