# Работа с проектом

Команды установки, запуска, проверок и Docker описаны в [README.md](README.md).

- `server/` содержит сервер Fastify, `frontend/` содержит приложение React, `api/` содержит исходный контракт TypeSpec, `tests/` содержит дымовой тест.
- При изменении API сначала обновите TypeSpec и выполните `npm run generate`. OpenAPI и клиентский SDK пересоздаются при сборке. Добавляйте изменения в исходный контракт.
- Сообщения коммитов следуют Conventional Commits, например `feat: add meeting types` или `fix: reject overlapping bookings`.
