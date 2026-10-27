# Скіл CyberStrike для Claude Code

Скіл у [`claude-skills/cyberstrike`](../claude-skills/cyberstrike/SKILL.md) дає Claude Code той самий доступ до робочих процесів CyberStrike, що й наш скіл Codex: спершу локальні матеріали потрібної категорії, потім власні інструменти Claude, CLI CyberStrike або вже підключений MCP. Він призначений для **CTF і дозволених навчальних лабораторій**.

Сам скіл не встановлює CyberStrike та залежності. Для Windows потрібен повний клон/збірка; для pwn — налаштована WSL2/Ubuntu, для crypto — відповідне Python-оточення. Дивіться [Windows](windows-setup.uk.md), [pwn](pwn.uk.md), [cryptography](cryptography.uk.md) та [Claude за підпискою](claude-subscription.uk.md).

## Встановлення на Windows

У PowerShell, у корені цього репозиторію:

```powershell
$source = (Resolve-Path -LiteralPath '.\claude-skills\cyberstrike').Path
$target = Join-Path $env:USERPROFILE '.claude\skills\cyberstrike'
if (Test-Path -LiteralPath $target) {
    throw 'Скіл уже є. Порівняйте файли та збережіть власні зміни перед оновленням.'
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
Copy-Item -LiteralPath $source -Destination $target -Recurse
```

За нестандартного каталогу конфігурації Claude Code використовуйте його каталог `skills` замість наведеного особистого шляху. Linux/macOS використовують ту саму структуру `~/.claude/skills/cyberstrike/`. Під час оновлення порівнюйте лише цю папку, зберігайте власні зміни й не перезаписуйте `settings.json`, `CLAUDE.md`, дозволи чи інші скіли.

Відкрийте нову сесію Claude Code в папці задачі й викличте:

```text
/cyberstrike Перевір pwn-оточення та локальну базу знань. Бінарник не запускай.
/cyberstrike Це crypto CTF. Прочитай локальні файли й відповідну методичку, не шукай врайтап.
```

Це два окремі приклади запитів. Скіл також може підбиратися автоматично за відповідним запитом. Для роботи лише з локальним CLI достатньо звичайного `claude`; для нового сеансу з MCP використовуйте `cyberstrike claude --agent pwn` або `cyberstrike claude --agent cryptography`. Наявний сеанс не потрібно вкладати в інший модельний процес заради локальної команди.

## Формат і сучасні моделі

Перевірено за офіційною документацією **27 жовтня 2026 року**. Opus 4.8 — нижня межа дослідження, а не єдина ціль. Переглянуто також окремі рекомендації для Opus 5/5.5, Sonnet 5.5 і Fable/Mythos 5.1. Скіл не прив'язаний до конкретної назви моделі; доступність кожної моделі у вашому тарифі перевіряється окремо.

- `SKILL.md` починається з YAML `name` і `description`; опис пояснює можливості й умови вибору. Використано особисте розташування та команду `/cyberstrike`. Поля `model`, `effort`, `context: fork` і попередні дозволи інструментів не задані: вибір користувача та звичайні дозволи залишаються чинними. [Формат Claude Code](https://code.claude.com/docs/en/skills).
- Основний файл містить спільні рішення та маршрутизацію. Чотири довідки підвантажуються за потреби; посилання на них ідуть безпосередньо з `SKILL.md`. Готові посібники категорій зберігаються в CyberStrike. [Рекомендації з авторства скілів](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).
- Для Opus 4.8 явно зазначено момент звернення до локальних матеріалів та інструментів. Замість примусових періодичних повідомлень — короткі оновлення при довгих операціях і блокерах. Параметри API thinking не переносяться в Claude Code через текст скілу. [Особливості Opus 4.8](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-4-8).
- Для новіших моделей не закодовано старий рівень effort чи вимогу показувати внутрішні міркування. Результат має спиратися на виконані перевірки; зведення дій коротке. При зміні моделі поведінку слід перевіряти окремо. [Поточні рекомендації](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), [Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5).

| Перевірені рекомендації | Що враховано в скілі |
| --- | --- |
| [Opus 4.8](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-4-8) | Явний момент читання локальних матеріалів та використання інструментів. |
| [Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5) | Зупинка після достатнього доказу результату; додаткові раунди перевірки лише за конкретної невирішеної проблеми. |
| [Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5) | Розділено короткий звіт користувачу та внутрішні міркування; API-параметри показу прогресу залишено клієнту. |
| [Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5) | Конкретний критерій успіху CTF, продовження вже дозволеної роботи й врахування уточнень під час виконання. |
| [Fable/Mythos 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1) | Групування незалежних читань, точкові правки, збереження обмежень і стану при продовженні довгої задачі. |

Це адаптація рекомендацій, а не твердження про тестування кожної моделі. Скіл не задає однаковий «оптимальний» effort для різних поколінь: він зберігає вибір користувача. Під час наступного оновлення моделі перевіряйте актуальну офіційну сторінку її prompting guide, а не переносіть старі налаштування автоматично.

Це скіл для локального **Claude Code**. Завантаження тих самих інструкцій у claude.ai не надає вебчату доступу до Windows, WSL чи локального CLI; такий доступ потребує окремої інтеграції.

## Перевірка

Перевіряйте YAML, назву папки, наявність усіх відносних посилань і доступність наведених команд у своїй збірці. Окремий поведінковий тест — короткий діагностичний запит без мережевої CTF-цілі: очікуються status/list і потрібні довідки, без рекурсивного пошуку домашнього каталогу, зміни effort чи запуску зайвої моделі. Валідність файлів не підтверджує поведінку всіх моделей; модельний тест витрачає її ліміт.
