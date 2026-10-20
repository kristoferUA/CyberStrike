# CyberStrike для CTF: повне встановлення на Windows

Ця інструкція налаштовує [форк kristoferUA/CyberStrike](https://github.com/kristoferUA/CyberStrike) для **CTF (Capture The Flag) задач і навчальних лабораторій із дозволом на тестування**: від встановлення Git і Bun до запуску з підпискою ChatGPT або Claude та підготовки браузерного інструмента.

Основні команди нижче призначені для **PowerShell**. Відкрийте його через **Win + R → `powershell` → Enter**. Приклади для CMD позначені окремо.

## Зміст

1. [Вимоги](#1-вимоги)
2. [Git і Bun](#2-встановлення-git-і-bun)
3. [Завантаження форка](#3-завантаження-форка)
4. [Збірка та Chromium](#4-збірка-та-встановлення-chromium)
5. [Додавання до PATH](#5-додавання-до-path)
6. [Вхід через ChatGPT](#6-вхід-через-підписку-chatgpt)
   - [Claude за підпискою](#claude-за-підпискою-ctf3)
7. [Перший запуск](#7-перший-запуск)
8. [Робота з CTF та браузерним інструментом](#8-робота-з-ctf-та-браузерним-інструментом)
9. [Оновлення](#9-оновлення-форка)
10. [Типові помилки](#10-типові-помилки)
11. [Скіл Codex та додаткові інструменти](#11-скіл-codex-та-додаткові-інструменти)
12. [Дані та стан перевірки](#12-дані-та-стан-перевірки)

## 1. Вимоги

- Windows **10 версії 1809 або новіша, зокрема Windows 11, x64**. Перевірена збірка — Windows x64 з Bun **1.4.3**. Поточний скрипт форка збирає виконуваний файл для x64. Мінімальні вимоги Bun наведено в [офіційній інструкції встановлення](https://bun.sh/docs/installation).
- Git, Bun і доступ до інтернету для завантаження репозиторію, залежностей, каталогу моделей та Chromium.
- Для ChatGPT — обліковий запис із доступом до використання підписки в сторонньому локальному застосунку. Для Claude — офіційний Claude Code і обліковий запис із доступом до нього за підпискою. Доступність і ліміти визначає відповідний провайдер.
- Папка для програми та окрема папка для файлів CTF-задачі.

Приклади використовують `D:\Projects\ctf\cyberstrike\CyberStrike`. Якщо у вас інший диск або каталог, замініть шлях у командах і PATH. Команди встановлення Git можуть показати стандартне підтвердження Windows.

## 2. Встановлення Git і Bun

### Git

У PowerShell:

```powershell
winget install --id Git.Git -e --source winget
```

Якщо `winget` відсутній, завантажте інсталятор **Git for Windows/x64** з [офіційної сторінки Git](https://git-scm.com/install/windows) і виконайте встановлення. Git має бути доступним із PowerShell та CMD.

### Bun

Виконайте офіційну команду встановлення у PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://bun.sh/install.ps1 | iex"
```

Спосіб встановлення й налаштування PATH описано в [документації Bun](https://bun.sh/docs/installation).

Після встановлення **повністю закрийте Windows Terminal або командний рядок і відкрийте знову**. Перевірте:

```powershell
git --version
bun --version
```

Обидві команди мають показати версію. Якщо Git і Bun уже встановлені та ці команди працюють, переходьте до наступного кроку.

Якщо Bun установився, але команда не знаходиться, перевірте його за повним шляхом:

```powershell
& "$env:USERPROFILE\.bun\bin\bun.exe" --version
```

Якщо повний шлях працює, додайте його каталог до PATH за [розділом 5](#5-додавання-до-path). Для продовження в поточному PowerShell також можна оновити PATH цієї сесії:

```powershell
$env:Path = "$env:USERPROFILE\.bun\bin;$env:Path"
bun --version
```

## 3. Завантаження форка

Для цієї інструкції використовується гілка **`feat/chatgpt-plan-windows-startup`**, яка містить виправлення CTF.2. Перша версія CTF.1 мала помилку пошуку браузерного worker.

У PowerShell:

```powershell
$csBase = 'D:\Projects\ctf\cyberstrike'
New-Item -ItemType Directory -Force -Path $csBase | Out-Null
Set-Location -LiteralPath $csBase
git clone --branch feat/chatgpt-plan-windows-startup https://github.com/kristoferUA/CyberStrike.git
Set-Location -LiteralPath (Join-Path $csBase 'CyberStrike')
git branch --show-current
```

Остання команда має показати `feat/chatgpt-plan-windows-startup`. Публічний форк завантажується за наведеним HTTPS-посиланням.

Якщо папка `CyberStrike` вже містить клон, скористайтеся [розділом оновлення](#9-оновлення-форка). Зберігайте власні зміни та файли задачі перед зміною гілки.

## 4. Збірка та встановлення Chromium

Перебуваючи в корені репозиторію, виконайте:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\script\build-windows.ps1
.\bin\cyberstrike.cmd --version
```

Скрипт послідовно:

1. Встановлює залежності за `bun.lock`.
2. Завантажує відкриті метадані models.dev і збирає програму.
3. Кладе `hackbrowser-worker.js` поруч із виконуваним файлом.
4. Встановлює Chromium через Playwright для браузерного інструмента.

Дочекайтеся завершення всіх кроків і повідомлення `Built CyberStrike CTF ...`. Поточна очікувана версія — **`1.1.16-ctf.6`**. Chromium завантажується окремо; це може зайняти час залежно від мережі. Браузери та їх версії пов'язані з версією Playwright. [Документація Playwright](https://playwright.dev/docs/browsers)

Результат у репозиторії:

```text
packages\cyberstrike\dist-windows\cyberstrike-windows-x64\bin\cyberstrike.exe
packages\cyberstrike\dist-windows\cyberstrike-windows-x64\bin\hackbrowser-worker.js
```

Для запуску використовуйте `bin\cyberstrike.cmd`. Він зберігає поточну папку задачі.

### Додаткові параметри збірки

| Параметр                            | Коли використовувати                                          |
| ----------------------------------- | ------------------------------------------------------------- |
| `-SkipInstall`                      | Залежності вже встановлені за поточним `bun.lock`.            |
| `-SkipBrowserInstall`               | Chromium уже встановлено або браузер підключається через CDP. |
| `-ModelsPath 'D:\Data\models.json'` | Є локальний JSON-знімок каталогу models.dev для збірки.       |
| `-Version '1.1.16-ctf.6'`           | Потрібно явно задати версію локальної збірки.                 |

Для першого встановлення виконуйте основну команду без параметрів пропуску. Перед повторною збіркою закрийте процеси, які використовують її `cyberstrike.exe`.

## 5. Додавання до PATH

PATH дозволяє запускати `bun` і `cyberstrike` з будь-якої папки.

1. Натисніть **Win + R** і введіть:

   ```text
   rundll32 sysdm.cpl,EditEnvironmentVariables
   ```

2. У верхньому розділі **«Змінні користувача»** виберіть **Path → Змінити**.
3. Натисніть **Створити** й додайте відсутні каталоги двома окремими рядками:

   ```text
   %USERPROFILE%\.bun\bin
   D:\Projects\ctf\cyberstrike\CyberStrike\bin
   ```

4. Збережіть наявні записи PATH і натисніть **OK** у всіх вікнах.
5. Повністю закрийте термінал і відкрийте знову.

У PATH додається **каталог**, що містить команду. Перевірте в новому PowerShell:

```powershell
Get-Command bun
Get-Command cyberstrike
bun --version
cyberstrike --version
```

Шлях CyberStrike має вести до `bin\cyberstrike.cmd` саме вашого форка. Якщо знайдено іншу інсталяцію, перевірте порядок записів PATH. До виправлення порядку запускайте форк за повним шляхом:

```powershell
& 'D:\Projects\ctf\cyberstrike\CyberStrike\bin\cyberstrike.cmd' --version
```

## 6. Вхід через підписку ChatGPT

Після налаштування PATH:

```powershell
cyberstrike auth login
```

1. Виберіть провайдера **OpenAI**.
2. Виберіть **ChatGPT plan (Sign in with ChatGPT)**.
3. Відкрийте посилання, показане терміналом, у браузері **на цьому комп'ютері**.
4. Увійдіть в обліковий запис ChatGPT і підтвердьте використання підписки програмою CyberStrike.
5. Поверніться до термінала й дочекайтеся підтвердження успішного входу.

Для цього способу **API-ключ не потрібен**. Використання залежить від доступу облікового запису, підтримуваних моделей та лімітів OpenAI. [Офіційна інструкція входу](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)

Отримайте доступні моделі:

```powershell
cyberstrike auth list
cyberstrike models openai
```

`auth list` показує збережене підключення, а `models openai` — моделі облікового запису. У наступних прикладах використано `openai/gpt-6-luna`: застосовуйте його, якщо він є у вашому списку, або замініть точним значенням із цього списку.

Якщо браузер повідомив про успіх, а термінал ще очікує, перевірте саме термінальний результат. Вхід і отримання списку моделей ще потребують успішної відповіді на перший запит для підтвердження доступу до моделі. [Моделі та запити](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)

### Claude за підпискою (CTF.3)

Замість входу через OpenAI можна використати офіційний Claude Code з MCP-інструментами CyberStrike. У PowerShell:

```powershell
& ([scriptblock]::Create((Invoke-RestMethod 'https://claude.ai/install.ps1'))) stable
cyberstrike claude --login
cyberstrike claude --status
Set-Location -LiteralPath 'D:\Projects\ctf\challenge'
cyberstrike claude --model sonnet
```

Завершіть вхід у Claude Code через свій обліковий запис Claude. Відкриється його нативний інтерфейс; через `/mcp` доступні CTF-інструменти CyberStrike. Авторизація залишається в Claude Code, API-ключ для входу через підписку не потрібен. Ліміти та облік використання визначає Anthropic. Провайдер `anthropic/...` у власному TUI призначений для API-ключа.

**[Повна інструкція Claude для Windows](claude-subscription.uk.md)** містить встановлення, PATH, вибір моделі, роботу браузера, типові помилки та обмеження. Наступні приклади `-m openai/...` стосуються режиму ChatGPT; для Claude запускайте `cyberstrike claude`.

## 7. Перший запуск

Створіть окрему папку задачі в PowerShell:

```powershell
$csTask = 'D:\Projects\ctf\cyberstrike\test'
New-Item -ItemType Directory -Force -Path $csTask | Out-Null
Set-Location -LiteralPath $csTask
cyberstrike -m openai/gpt-6-luna
```

Має відкритися термінальний інтерфейс із полем введення, назвою моделі та папкою задачі. Спершу надішліть простий запит:

```text
Reply exactly READY. Do not call tools or browse.
```

Дочекайтеся завершеної відповіді. Після цього можна починати задачу. Програма може виконувати локальні команди та створювати файли в поточній папці.

### Як виконати запуск у CMD

Командний рядок CMD зазвичай показує запрошення `D:\...>`. PowerShell показує `PS D:\...>`.

| Дія                                   | PowerShell                                        | CMD                                          |
| ------------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| Перейти в папку іншого диска          | `Set-Location 'D:\Projects\ctf\cyberstrike\test'` | `cd /d "D:\Projects\ctf\cyberstrike\test"`   |
| Запустити файл за шляхом із пробілами | `& 'D:\Tools\CyberStrike\bin\cyberstrike.cmd'`    | `"D:\Tools\CyberStrike\bin\cyberstrike.cmd"` |
| Знайти команду                        | `Get-Command cyberstrike`                         | `where cyberstrike`                          |

Приклад CMD після налаштування PATH:

```cmd
cd /d "D:\Projects\ctf\cyberstrike\test"
cyberstrike -m openai/gpt-6-luna
```

Команда `Set-Location` працює в PowerShell; `cd /d` — у CMD. Якщо ви вже перебуваєте в корені репозиторію `CyberStrike`, наступний крок — збірка або запуск.

## 8. Робота з CTF та браузерним інструментом

У папку задачі покладіть її файли. У першому повідомленні зазначте опис, точну дозволену ціль, правила та формат прапора. Наприклад, заповніть цей шаблон:

```text
Це CTF-задача. Дозволена ціль: [URL або хост, наданий організаторами].
Правила та обмеження: [дозволені методи, ліміти, заборонені дії].
Формат прапора: [формат]. Опис задачі: [опис].
Спочатку проаналізуй надані файли й запропонуй план у цих межах.
```

Знайдені посилання й нові хости перевіряйте за правилами CTF перед розширенням роботи.

### Модель за замовчуванням для браузерного інструмента

HackBrowser бере модель із налаштувань за замовчуванням. Щоб задати її для конкретної задачі, створіть або доповніть файл **`cyberstrike.json` у папці задачі**:

```json
{
  "model": "openai/gpt-6-luna"
}
```

Використовуйте доступну вам модель. Якщо файл уже містить налаштування, додайте поле `model`, зберігши решту. Після зміни перезапустіть CyberStrike в цій папці.

Скрипт збірки готує Playwright і Chromium. Для ChatGPT у версії CTF.2 браузерний процес використовує основне підключення CyberStrike через локальний адаптер. Повний обхід через цей адаптер ще потребує перевірки; якщо виникає помилка, збережіть її текст і журнал.

Команда нижче показує параметри браузерного запуску:

```powershell
cyberstrike hackbrowser --help
```

## 9. Оновлення форка

Закрийте CyberStrike. У PowerShell:

```powershell
Set-Location -LiteralPath 'D:\Projects\ctf\cyberstrike\CyberStrike'
git status --short
git fetch origin
git switch feat/chatgpt-plan-windows-startup
git pull --ff-only
powershell -NoProfile -ExecutionPolicy Bypass -File .\script\build-windows.ps1
.\bin\cyberstrike.cmd --version
```

`git status --short` показує локальні зміни. Якщо Git зупинив перемикання гілки або оновлення через них, спочатку збережіть свої зміни. Поточна збірка має суфікс `-ctf.6`; вона містить виправлення CTF.2.

Вхід через ChatGPT зберігається у даних користувача. Повторюйте його, якщо програма повідомляє про недійсне підключення. Оновлення цього форка виконується через Git і повторну збірку; інсталятор upstream встановлює оригінальну версію.

## 10. Типові помилки

### `bun is not recognized` або `Get-Command bun` завершується помилкою

Перевірте повний шлях до Bun за [розділом 2](#2-встановлення-git-і-bun), а потім додайте його каталог до PATH. Якщо файлу там немає, повторіть офіційне встановлення Bun. Перезапустіть весь термінал після зміни PATH.

### `Set-Location is not recognized` або помилка параметра `/d`

Команди оболонок змішані. Використовуйте таблицю з [розділу 7](#7-перший-запуск): PowerShell — `Set-Location`, CMD — `cd /d`.

### `cyberstrike is not recognized`

Додайте **папку `CyberStrike\bin`** до PATH. Перевірте запуск за повним шляхом та наявність виконуваного файлу після збірки.

### `CyberStrike CTF executable is missing`

Збірку ще не завершено або її вихідні файли відсутні. У корені репозиторію повторіть `script\build-windows.ps1` і дочекайтеся успішного завершення.

### `hackbrowser worker not found`

Оновіть робочу гілку й перебудуйте за [розділом 9](#9-оновлення-форка). Перевірте версію `-ctf.3` або новішу і файл, перебуваючи в корені репозиторію:

```powershell
Get-Item .\packages\cyberstrike\dist-windows\cyberstrike-windows-x64\bin\hackbrowser-worker.js
```

У CTF.2 worker має лежати поруч із `cyberstrike.exe`. Запускайте програму через launcher цього самого клону.

### Playwright або Chromium недоступні

Виконайте повну збірку без параметрів пропуску. Якщо залежності вже встановлені й потрібно лише повторити завантаження Chromium, у корені репозиторію:

```powershell
bun .\node_modules\playwright\cli.js install chromium
```

За помилки завантаження перевірте доступ до мережі та наведений у журналі URL. За помилки TLS перевірте налаштування довіри до сертифікатів на вашій машині або у корпоративній мережі.

### `Access denied`, `file is being used` під час повторної збірки

Закрийте процеси CyberStrike, що працюють із цією збіркою, і повторіть збірку. Переконайтеся, що маєте право запису до папки клону.

### Показується стара версія

Порівняйте результати:

```powershell
Get-Command cyberstrike -All
cyberstrike --version
& 'D:\Projects\ctf\cyberstrike\CyberStrike\bin\cyberstrike.cmd' --version
```

Якщо повний шлях показує нову версію, виправте порядок PATH. Якщо обидва показують стару, перевірте гілку, отримайте зміни й повторіть збірку.

### Модель недоступна або підключення ChatGPT потребує оновлення

Повторіть `cyberstrike auth login` з методом **ChatGPT plan (Sign in with ChatGPT)**, потім `cyberstrike models openai`. Використовуйте точне значення зі списку. Якщо вибираєте інший обліковий запис, спочатку виконайте `cyberstrike auth logout` і виберіть OpenAI.

За повідомлення про ліміт використання перегляньте доступ і використання застосунку в налаштуваннях ChatGPT. [OpenAI: помилки та відновлення](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery)

### Порожній інтерфейс, таймаут worker або помилка запуску сервера

Якщо в консолі виділено текст, натисніть Esc, щоб завершити виділення. Закрийте проблемний процес і запустіть із діагностикою:

```powershell
cyberstrike --print-logs --log-level DEBUG -m openai/gpt-6-luna
```

Якщо повідомлення стосується зайнятого порту 4096, закрийте інший процес CyberStrike, який використовує цей порт, або виберіть інший порт:

```powershell
cyberstrike --port 4097 -m openai/gpt-6-luna
```

До повідомлення про проблему додайте версію, текст помилки, команду запуску та назву оболонки. Перед передаванням журналу приберіть токени, паролі й секрети задачі.

## 11. Скіл Codex та додаткові інструменти

### Скіл

У репозиторії є [`codex-skills/cyberstrike/SKILL.md`](../codex-skills/cyberstrike/SKILL.md). Скопіюйте папку `cyberstrike` до каталогу скілів вашого Codex, зазвичай `%USERPROFILE%\.codex\skills`. Якщо папка вже є, спершу порівняйте вміст і збережіть власні зміни. Після встановлення відкрийте новий чат Codex і викличте `$cyberstrike`.

### MCP та зовнішні програми

Стан додаткових MCP-серверів можна переглянути командами:

```powershell
cyberstrike mcp list
cyberstrike mcp --help
```

`Disabled` означає, що відповідний MCP-сервер вимкнений у конфігурації. Для його підключення потрібні його власний процес або адреса, залежності та, за потреби, авторизація. Додавання виконується через `cyberstrike mcp add`; дотримуйтеся інструкцій конкретного сервера.

Nmap, Docker та інші зовнішні інструменти встановлюйте окремо для задач, яким вони потрібні. CyberStrike на Windows може використовувати Git Bash, що входить до Git for Windows, для виконання команд.

## 12. Дані та стан перевірки

Режим Claude у CTF.3 описано [окремо](claude-subscription.uk.md). Вхід зберігається засобами офіційного Claude Code. MCP-процес зберігає результати інструментів і перехоплені запити у даних CyberStrike; Claude аналізує їх у поточній сесії. Повний сценарій Claude з підпискою та браузером потребує входу користувача й окремої перевірки.

За типовим налаштуванням дані користувача лежать у `%USERPROFILE%\.local\share\cyberstrike`, а конфігурація — у `%USERPROFILE%\.config\cyberstrike`. Змінні XDG можуть змінювати ці шляхи. OAuth-дані зберігаються у каталозі даних користувача; тримайте його приватним. Файли задачі створюються у вибраній робочій папці.

Під час підготовки форка пройшли встановлення залежностей за lock-файлом, збірка Windows, генерація SDK та окрема перевірка типів RPC. Раніше термінальний інтерфейс відображав поле введення й модель; три тести RPC пройшли під час виправлення запуску. Код CTF.2 зібрано з браузерним worker. Повний браузерний обхід через новий адаптер ChatGPT та оновлення токенів кількома процесами ще не перевірено. Для першого налаштування використовуйте один процес CyberStrike.

Загальна перевірка типів у цьому Windows-клоні мала наявні помилки залежностей та символічного посилання в пакеті enterprise. Вони описані у PR. Це не є підтвердженням працездатності всіх інструментів; конкретний CTF-сценарій перевіряється після завершення встановлення.

Форк зберігає [ліцензію AGPL-3.0](../LICENSE) та походить від [CyberStrikeus/CyberStrike](https://github.com/CyberStrikeus/CyberStrike). Зміни форка й короткий огляд — у [документації CTF](ctf-fork.uk.md).

## Cryptography (CTF.6)

Для криптографічних CTF-задач додатково встановіть uv, виконайте `cyberstrike crypto setup` і запустіть `cyberstrike --agent cryptography`. Sage використовується через публічний SageCell API. [Повна інструкція з оточенням, методикою та CLI](cryptography.uk.md).
