import { readFileSync } from 'node:fs';
import { Ajv } from 'ajv';
import type { AnySchema } from 'ajv';
import addFormats from 'ajv-formats';
import { expect } from 'vitest';

interface OpenApiDocument {
  paths: Record<string, Record<string, {
    responses: Record<string, {
      content?: Record<string, { schema: AnySchema }>;
    }>;
  }>>;
  components?: object;
}

const openApi: OpenApiDocument = JSON.parse(
  readFileSync(new URL('../generated/openapi.json', import.meta.url), 'utf8'),
);
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

export async function expectOpenApiResponse(
  response: Response,
  path: string,
  method: 'get' | 'post',
  status: number,
): Promise<unknown> {
  expect(response.status).toBe(status);
  const expectedResponse = openApi.paths[path]?.[method]?.responses[status];
  expect(expectedResponse, `OpenAPI response for ${method.toUpperCase()} ${path} ${status}`).toBeDefined();

  const contentType = response.headers.get('content-type')?.split(';', 1)[0];
  expect(contentType).toBe('application/json');
  const schema = expectedResponse.content?.['application/json']?.schema;
  expect(schema).toBeDefined();

  const body: unknown = await response.json();
  const validate = ajv.compile({ components: openApi.components, allOf: [schema] });
  expect(validate(body), ajv.errorsText(validate.errors)).toBe(true);

  return body;
}
