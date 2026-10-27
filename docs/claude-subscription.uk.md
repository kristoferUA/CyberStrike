# Claude за підпискою у CyberStrike CTF на Windows

Починаючи з **1.1.16-ctf.3**, команда `cyberstrike claude` відкриває офіційний Claude Code у поточній папці задачі та підключає до нього CTF-інструменти CyberStrike через MCP. Вхід виконує сам Claude Code. Для входу через особисту підписку API-ключ не потрібен.

Цей режим призначений для **CTF (Capture The Flag) і навчальних лабораторій із дозволом на тестування**. Вказуйте цілі й обмеження змагання до будь-якого мережевого сканування.

Для прямого використання локальної бази знань, crypto-оточення та WSL QEMU/GDB у Claude Code встановіть [скіл CyberStrike](claude-skill.uk.md), аналогічний скілу Codex. Він працює у звичайному `claude` через CLI або в режимі `cyberstrike claude` через доступні MCP-інструменти.

## 1. Оновіть і зберіть форк

Потрібні Git for Windows, Bun і 64-бітна Windows. Якщо це перше встановлення, виконайте [повну інструкцію Windows](windows-setup.uk.md), розділи 1–5. Нижче — команди **PowerShell**; замініть шлях своїм.

```powershell
Set-Location -LiteralPath 'D:\Projects\ctf\cyberstrike\CyberStrike'
git status --short
git switch feat/chatgpt-plan-windows-startup
git pull --ff-only
powershell -NoProfile -ExecutionPolicy Bypass -File .\script\build-windows.ps1
.\bin\cyberstrike.cmd --version
```

Очікувана версія — `1.1.16-ctf.3` або новіша. Перед збіркою закрийте CyberStrike. Якщо Git показує локальні зміни, спочатку збережіть їх; не скидайте роботу примусово. Оригінальний пакет npm не містить цього режиму.

## 2. Встановіть офіційний Claude Code

У PowerShell виконайте офіційний інсталятор стабільного каналу:

```powershell
& ([scriptblock]::Create((Invoke-RestMethod 'https://claude.ai/install.ps1'))) stable
```

Закрийте й відкрийте термінал. Перевірте:

```powershell
claude --version
claude doctor
```

Якщо `claude` не знайдено, перевірте типовий шлях:

```powershell
& "$env:USERPROFILE\.local\bin\claude.exe" --version
```

CyberStrike автоматично перевіряє цей шлях, навіть якщо його ще немає у PATH. Для іншого розташування задайте шлях до офіційного виконуваного файлу:

```powershell
$env:CYBERSTRIKE_CLAUDE_PATH = 'D:\Tools\Claude\claude.exe'
```

Якщо Claude Code повідомляє про відсутній Git Bash, перевірте встановлення Git for Windows. Для нестандартної інсталяції вкажіть наявний `bash.exe` через `CLAUDE_CODE_GIT_BASH_PATH`, як описано в [документації Claude Code](https://code.claude.com/docs/en/setup).

## 3. Увійдіть через підписку Claude

Якщо папка `bin` форка вже у PATH:

```powershell
cyberstrike claude --login
cyberstrike claude --status
```

Без PATH:

```powershell
$cyberstrike = 'D:\Projects\ctf\cyberstrike\CyberStrike\bin\cyberstrike.cmd'
& $cyberstrike claude --login
& $cyberstrike claude --status
```

У вікні Claude Code виберіть свій обліковий запис Claude з підпискою та завершіть вхід у браузері. Не вибирайте Console/API billing, якщо хочете використати підписку. CyberStrike не отримує й не копіює токени Claude Code.

Перевіряйте спосіб входу в результаті `--status`. Значення `authMethod: "claude.ai"` означає вхід через Claude; `api_key` або `api_key_helper` указують на налаштування API. Уже задані ключі, змінні середовища, корпоративні налаштування й додаткові кредити можуть впливати на облік використання. CyberStrike зберігає нативні способи входу Claude Code та не змінює налаштування оплати.

Ліміти, доступні моделі й облік додаткового використання визначає Anthropic і ваш тариф. Активна підписка не означає необмежену роботу. Перед тривалим обходом перевірте налаштування usage/extra usage у Claude. Актуальні умови наведено в [довідці Anthropic про використання плану](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan).

## 4. Запустіть у папці CTF-задачі

PowerShell:

```powershell
Set-Location -LiteralPath 'D:\Projects\ctf\challenge'
cyberstrike claude --model sonnet
```

CMD:

```cmd
cd /d "D:\Projects\ctf\challenge"
cyberstrike claude --model sonnet
```

Без `--model` головна сесія використовує налаштування самого Claude Code. Планувальник браузера використовує `sonnet` або значення `ANTHROPIC_MODEL`; явний `--model` задає модель обом. Якщо змінюєте модель у запущеному Claude Code, перезапустіть команду з `--model`, щоб браузер використовував ту саму модель.

Можна передати перший запит у лапках:

```powershell
cyberstrike claude --model sonnet 'Це CTF. Спочатку прочитай локальний опис задачі й уточни дозволену ціль та правила.'
```

Додаткові параметри Claude Code передавайте після `--`, наприклад:

```powershell
cyberstrike claude --model sonnet -- --continue
```

Відкриється інтерфейс **Claude Code**. Через `/mcp` перевірте підключення `cyberstrike`. При першому використанні підтвердьте потрібні дозволи в нативному інтерфейсі. Правила `deny` і `ask` із конфігурації CyberStrike також діють; для `ask` клієнт має підтримувати MCP form elicitation.

## 5. Доступні інструменти й браузер

Через MCP доступні CTF-методологія, `scope_check`, облік знахідок, HTTP replay, дані перехоплених запитів, звіти, HackBrowser та інші спеціалізовані інструменти CyberStrike. Файли, термінал, редагування й підзадачі обслуговує Claude Code. Зовнішні програми на кшталт Nmap встановлюються окремо.

Для браузера потрібні Playwright, Chromium і Bun — їх готує скрипт збірки форка. Спочатку надайте Claude точну ціль змагання та дозволений scope. Після запуску обходу:

- `hackbrowser_status` показує стан і помилки;
- `hackbrowser_stop` зупиняє обхід;
- `web_get_session_context` показує зібрані endpoint-и;
- `web_get_request_detail` дає деталі вибраного запиту.

HackBrowser працює у фоні. Повторний виклик `hackbrowser` не використовується для очікування результату. Для входу на CTF-сайт через браузер потрібна ваша присутність; паролі Claude Code не передаються.

Планувальник обходу викликає офіційний `claude -p` без доступу до інструментів. Він використовує той самий нативний механізм авторизації й також витрачає доступні ліміти/кредити. Це окремі короткі запити, тому швидкість і облік використання відрізняються від одного чату. Запити та відповіді цільового CTF-сайту передаються вибраній моделі під час аналізу.

У цьому режимі захоплені HTTP-запити зберігаються локально; їх аналізує Claude у поточному чаті. Фонові API-агенти CyberStrike не запускаються. Неоднозначні частини URL без окремого модельного класифікатора залишаються літеральними. Кожен новий MCP-процес створює нову сесію даних CyberStrike, навіть коли Claude продовжує попередню розмову.

## Cryptography (CTF.4)

Після `cyberstrike crypto setup` запускайте `cyberstrike claude --agent cryptography --model sonnet`. Профіль додає вісім криптографічних скілів, довідник, окрему методику та локальні Python-інструменти; Sage обчислюється через публічний SageCell API. [Повна інструкція](cryptography.uk.md). Для цього профілю потрібна CTF.4 або новіша збірка.

## 6. Типові помилки

| Повідомлення або симптом                                       | Дія                                                                                                                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Unknown argument: claude`                                     | Оновіть форк і повторіть збірку. Перевірте `where.exe cyberstrike`: PATH може вести на стару програму.                                                          |
| `Native Claude Code was not found`                             | Установіть нативний Claude Code, перевірте `.local\bin\claude.exe` або задайте `CYBERSTRIKE_CLAUDE_PATH`. На Windows потрібен `.exe`, не npm-обгортка `.cmd`.   |
| Немає авторизації або вичерпано ліміт                          | Виконайте `cyberstrike claude --status`, за потреби `--login`. Перевірте тариф і ліміти в Claude.                                                               |
| MCP не підключився                                             | У Claude відкрийте `/mcp`; перевірте шлях до форка, версію CTF.3 і `claude doctor`. Для великих проєктів можна збільшити нативний `MCP_TIMEOUT` перед запуском. |
| `Approval required`                                            | Оновіть Claude Code для підтримки MCP form elicitation та підтвердьте дію. Не знімайте правила `deny` для усунення цієї помилки.                                |
| `hackbrowser worker not found` / немає Playwright або Chromium | Зберіть форк без `-SkipInstall` і `-SkipBrowserInstall`. Деталі — у Windows-інструкції.                                                                         |
| Вибрано `anthropic/...` у TUI, але є лише підписка             | Запускайте `cyberstrike claude`. Провайдер `anthropic/...` у власному TUI призначений для API-ключа.                                                            |

Старий прямий OAuth-адаптер Claude видалено. Старі записи авторизації CyberStrike не переносяться до Claude Code й не використовуються для запитів. За потреби видаліть старе підключення штатною командою `cyberstrike auth logout` та ввійдіть через `cyberstrike claude --login`.

## Стан реалізації та джерела

Windows-збірку CTF.3 створено. Повний сценарій із входом у платний Claude, викликом моделі й обходом CTF-сайту потребує входу користувача та окремої перевірки. Сам факт збірки не підтверджує такий сценарій.

Режим запускає незмінений офіційний виконуваний файл і залишає авторизацію й умови використання Anthropic. Дивіться [умови вбудовування Claude Code](https://code.claude.com/docs/en/legal-and-compliance), [довідку команд](https://code.claude.com/docs/en/cli-reference), [MCP](https://code.claude.com/docs/en/mcp) і [програмний запуск CLI](https://code.claude.com/docs/en/headless).
