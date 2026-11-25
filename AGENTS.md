# Работа с проектом

Команды установки, запуска, проверок и Docker описаны в [README.md](README.md).

- `server/` содержит сервер Fastify, `frontend/` содержит приложение React, `api/` содержит исходный контракт TypeSpec, `tests/` содержит дымовой тест.
- При изменении API сначала обновите TypeSpec и выполните `npm run generate`. Генерируемые пути: `generated/` (OpenAPI) и `frontend/src/api/generated/` (SDK). Не изменяйте содержимое этих каталогов вручную и не коммитьте его. CI генерирует их из чистого состояния перед сборкой и тестами.
- `npm run check` запускает общую проверку проекта локально и в CI.
- Сообщения коммитов следуют Conventional Commits. Коммит реализации ссылается на тикет, например `feat: add the meeting types catalog (#9)`.

## Agent skills

Скиллы установлены в `.agents/skills/`. В Codex вызывайте их по имени, например `$wayfinder`. Если агент не показывает скилл в меню, укажите путь к его `SKILL.md`.

### Issue tracker

Карты решений, спецификации и тикеты ведём в GitHub Issues репозитория `OttIvan/ai-for-developers-project-386`. См. [issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

Используем стандартные метки набора. См. [triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

У приложения один контекст. Словарь хранится в `GLOSSARY.md`, решения — в `docs/adr/`. См. [domain.md](docs/agents/domain.md).
