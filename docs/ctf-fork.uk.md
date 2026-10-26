# CyberStrike для CTF

[English](ctf-fork.md)

**[Повна інструкція встановлення на Windows](windows-setup.uk.md)** — усі кроки від Git і Bun до PATH, ChatGPT, Chromium та розв'язання помилок.

Цей форк призначений для **CTF (Capture The Flag) задач і навчальних лабораторій із дозволом на тестування**. Вкажіть ціль, надану організаторами, файли задачі та правила. Усі дії мають залишатися в цих межах.

## Встановлення на Windows

Потрібні Git і Bun. Збірку виконано на Windows x64 з Bun 1.4.3. Відкрийте PowerShell:

```powershell
git clone --branch feat/chatgpt-plan-windows-startup https://github.com/kristoferUA/CyberStrike.git
Set-Location CyberStrike
powershell -NoProfile -ExecutionPolicy Bypass -File .\script\build-windows.ps1
.\bin\cyberstrike.cmd --version
```

Поки зміни перебувають у pull request, перед збіркою перейдіть на гілку `feat/chatgpt-plan-windows-startup`. Скрипт встановлює залежності за `bun.lock`, збирає виконуваний файл у `packages/cyberstrike/dist-windows/cyberstrike-windows-x64/bin`, встановлює Chromium для браузерного інструмента та додає до версії позначку CTF. Перед повторною збіркою закрийте запущений файл.

`-SkipInstall` пропускає встановлення вже наявних залежностей. `-SkipBrowserInstall` пропускає встановлення вже наявного Chromium або підходить для використання браузера через CDP. `-ModelsPath <файл>` дозволяє передати локальний JSON каталогу models.dev; інакше збірка завантажує відкриті метадані моделей.

Для оновлення цього форка отримайте його нові зміни та повторіть збірку. Інсталятор і пакет npm оригінального CyberStrike не містять виправлень форка.

## Підключення підписки ChatGPT

```powershell
.\bin\cyberstrike.cmd auth login
.\bin\cyberstrike.cmd models openai
```

Виберіть **OpenAI → ChatGPT plan (Sign in with ChatGPT)**. Відкрийте посилання, увійдіть у свій обліковий запис і підтвердьте використання підписки програмою CyberStrike. Для цього способу API-ключ не потрібен. Доступність моделей і ліміти залежать від облікового запису та поточних умов OpenAI. Деталі: [вхід](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [моделі й запити](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference).

Використовуйте точну назву моделі зі списку `models openai`. Якщо програма повідомляє про старе підключення або відсутній дозвіл на використання підписки, повторіть вхід цим способом. Власні дані авторизації CyberStrike зберігаються у каталозі даних користувача поза репозиторієм.

## Підписка Claude (CTF.3)

Встановіть офіційний Claude Code, виконайте `cyberstrike claude --login`, потім `cyberstrike claude --model sonnet` у папці CTF-задачі. Авторизацію й облік використання виконує Claude Code; через MCP доступні CTF-інструменти CyberStrike. API-ключ для входу через підписку не потрібен. Власний TUI-провайдер `anthropic/...` працює з API-ключем. [Повна інструкція для Windows](claude-subscription.uk.md).

## Запуск у папці CTF-задачі

### Режим cryptography

Режим `cryptography` містить 8 скілів, 19 довідкових розділів із `ljagiello/ctf-skills`, власну методику, ізольований Python-інструментарій і Sage через API SageCell. [Сетап та використання](cryptography.uk.md).

У CTF.5 стандартний `solve` повертає перевірений результат і solver; повний `report` доступний за запитом. Додано пошук за словами й синонімами, короткі бюджети експериментів і пакетний запис доказів. Вибраний у TUI effort зберігається, зокрема після стискання контексту.

CTF.6 додає пріоритет погодженої перевірки публічного RSA-модуля у FactorDB і повторне використання результатів перевірок. Виправлено створення файла `F` замість повного Windows-шляху у `apply_patch`, а також неактивні нульові параметри рядків у пошуку довідника.

```powershell
cyberstrike crypto setup
cyberstrike --agent cryptography
```

У відкритому інтерфейсі режим також доступний у списку вибору агента. Він працює з поточною моделлю; за потреби її можна вказати через `-m`. Для Claude: `cyberstrike claude --agent cryptography --model sonnet`. Локальний Sage не потрібен; передані до SageCell код і параметри обробляє публічний сторонній сервіс.

### Основний режим

Замініть приклади шляхів і назву моделі своїми значеннями.

PowerShell:

```powershell
$cyberstrike = 'D:\Tools\CyberStrike\bin\cyberstrike.cmd'
Set-Location 'D:\CTF\challenge'
& $cyberstrike -m 'openai/<модель-зі-списку>'
```

CMD:

```cmd
cd /d "D:\CTF\challenge"
"D:\Tools\CyberStrike\bin\cyberstrike.cmd" -m openai/gpt-6-luna
```

`cd /d` використовується в CMD. У PowerShell використовуйте `Set-Location`. Програма працює в поточній папці задачі. За бажанням додайте папку `bin` форка до свого PATH.

У першому запиті опишіть задачу, дозволену ціль, формат прапора та обмеження змагання. Інструменти можуть виконувати локальні команди в папці задачі.

## Скіл для Codex

Скіл включено до [`codex-skills/cyberstrike/SKILL.md`](../codex-skills/cyberstrike/SKILL.md). Скопіюйте папку `cyberstrike` до каталогу скілів Codex (зазвичай `~/.codex/skills`). Якщо скіл із такою назвою вже встановлено, спочатку порівняйте його вміст. Відкрийте новий чат Codex і викличте `$cyberstrike`.

## Виправлення HackBrowser (CTF.2)

Якщо версія CTF.1 повідомляє `hackbrowser worker not found`, оновіть гілку та повторіть збірку:

```powershell
git pull --ff-only
powershell -NoProfile -ExecutionPolicy Bypass -File .\script\build-windows.ps1
.\bin\cyberstrike.cmd --version
```

Виправлення входить у `-ctf.2` та новішу `-ctf.3`. Програма тепер спочатку шукає worker поруч із виконуваним файлом, а Playwright — від його каталогу. Інсталяція оригінального пакета npm замінила б цей форк.

Для використання підписки ChatGPT браузерний інструмент надсилає запити моделі через локальне підключення до головного процесу. Головний процес зберігає OAuth-авторизацію та оновлює її; дочірній отримує тимчасовий доступ лише до однієї моделі. Для планувальника, який очікує JSON, відповідь формується після завершення обов'язкового потоку подій OpenAI. Код зібрано; повний браузерний обхід через це підключення ще потребує перевірки.

## Виправлення та стан перевірки

Виправлено втрату першого запиту до Bun worker: головний процес тепер чекає готовності обробника. Помилки worker і таймаут готовності повертаються до головного процесу. Версія залежності SDK більше не визначається неопублікованою версією CTF-збірки.

Вхід через ChatGPT використовує окрему реєстрацію CyberStrike, PKCE, перевірку state/nonce та підпису ID token. Запити адаптовано до [поточних обмежень доступу через підписку](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations). Оновлення токена послідовне в межах одного процесу.

Термінальний інтерфейс відображав логотип, поле запиту й вибрану модель під час запуску через CMD. Три тести виправлення RPC пройшли. **Повну відповідь моделі, виконання інструментів і одночасне оновлення токенів кількома процесами ще не перевірено.** Після входу спершу надішліть простий нешкідливий запит. До перевірки не запускайте кілька процесів з одним OAuth-підключенням.

Повна перевірка типів пакета зіткнулася з наявними помилками залежностей і розв'язання типів; окрема перевірка RPC пройшла.

Якщо інтерфейс порожній, закрийте цей процес і отримайте діагностику:

```powershell
& $cyberstrike --print-logs --log-level DEBUG -m 'openai/<модель-зі-списку>'
```

Перед передаванням журналу приберіть токени, паролі та секрети задачі.

## Походження та ліцензія

Основа: [CyberStrikeus/CyberStrike](https://github.com/CyberStrikeus/CyberStrike), коміт `ec4fe5c4252668f2acea7665e7c7c1edcd892c65`. Збережено авторські повідомлення та [AGPL-3.0](../LICENSE). Цей форк не є офіційним релізом OpenAI або CyberStrike.

## Pwn та локальна база знань для Codex (CTF.8)

Профіль `pwn` містить 8 скілів, 22 піновані матеріали й власну методику. На Windows потрібні WSL2/Ubuntu; `script/setup-pwn-windows.ps1` підготує чисту машину й окреме оточення з pwntools, QEMU та GDB-multiarch. Codex спочатку читає локальні матеріали відповідної категорії через `cyberstrike knowledge` і може сам запускати `cyberstrike pwn debug/run/inspect` без іншої моделі. [Повна інструкція](pwn.uk.md).
