# Pwn CTF: Windows, WSL2, QEMU та GDB (CTF.8)

Профіль `pwn` призначений для CTF і дозволених навчальних лабораторій. Він містить 8 адаптованих скілів, 22 піновані файли знань із MIT-репозиторію [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-pwn), методику та керований Linux-інструментарій. Windows CLI викликає конкретний дистрибутив Ubuntu через WSL2. Системна Python Windows не використовується.

## 1. Сетап на чистій Windows

Потрібні Windows 11 або Windows 10 з підтримкою WSL2, увімкнена апаратна віртуалізація, Git і Bun. Свіжу машину можна підготувати так:

```powershell
git clone --branch feat/chatgpt-plan-windows-startup https://github.com/kristoferUA/CyberStrike.git
Set-Location CyberStrike
powershell -NoProfile -ExecutionPolicy Bypass -File .\script\setup-pwn-windows.ps1
```

Якщо WSL/Ubuntu відсутні, скрипт повідомить, що треба відкрити PowerShell від адміністратора; у ньому повторіть ту саму команду. Він використовує офіційний `wsl --install -d Ubuntu --no-launch --web-download`. Якщо `wsl.exe` ще недоступний, в адміністраторському PowerShell спочатку:

```powershell
wsl --install --no-distribution
```

За запитом Windows перезавантажте машину самостійно. Потім:

```powershell
wsl --install -d Ubuntu --no-launch --web-download
wsl -d Ubuntu
```

У першому вікні Ubuntu створіть звичайного Linux-користувача та пароль, виконайте `exit`. Після цього з **вашого звичайного облікового запису Windows**, у PowerShell у клоні репозиторію:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\script\setup-pwn-windows.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\script\build-windows.ps1
.\bin\cyberstrike.cmd --version
.\bin\cyberstrike.cmd pwn status
```

Очікується `1.1.16-ctf.8` або новіша, `ready: true`, `lockMatches: true`. Установка не перезавантажує Windows сама, не видаляє дистрибутиви, не змінює стандартний WSL-дистрибутив і не перебудовує існуюче crypto-оточення. Не використовуйте для цього `docker-desktop`.

Перевірка WSL2:

```powershell
wsl --list --verbose
# Якщо обраний Ubuntu має VERSION 1:
wsl --set-version Ubuntu 2
```

Якщо Ubuntu вже налаштований, запускайте інсталер звичайно. Для іншої назви, наприклад `Ubuntu-24.04`, задайте `-Distribution Ubuntu-24.04` інсталеру й `--distribution Ubuntu-24.04` CLI-командам. Для TUI збережіть у конфігурації `"pwn": { "distribution": "Ubuntu-24.04" }`. Усі запуски адресовані цьому дистрибутиву явно. Для повторного Python-сетапу без apt використовуйте `-SkipSystemPackages`.

Якщо Ubuntu запускається як root, спочатку створіть звичайного користувача й виберіть його стандартним для цього дистрибутива: для Store-версії Ubuntu використайте відповідний launcher, наприклад `ubuntu config --default-user <ім'я>`; для імпортованого дистрибутива — секцію `[user] default=<ім'я>` в `/etc/wsl.conf`. Дивіться [команди WSL](https://learn.microsoft.com/en-us/windows/wsl/basic-commands#change-the-default-user-for-a-distribution). Інсталер не вигадує паролі та не змінює користувача наявного Ubuntu.

Офіційні матеріали: [WSL installation](https://learn.microsoft.com/en-us/windows/wsl/install), [pwntools installation](https://docs.pwntools.com/en/stable/install.html).

## 2. Що встановлюється

В Ubuntu через apt: QEMU user-mode для x86, ARM/AArch64, MIPS, RISC-V тощо; `qemu-system-x86`, `gdb`, `gdb-multiarch`, binutils, `file`, `strace`, `ltrace`, `patchelf`, build-essential та ARM64 cross-компілятор/бібліотеки. QEMU system потрібен для наданих kernel/VM лабораторій; user-mode — для ELF-програм.

Окремо в `~/.local/share/cyberstrike/pwn/`: bootstrap uv, керований Python 3.12 і venv з pwntools 4.15.0, ROPgadget 7.7, ropper 1.13.13, Capstone, Unicorn, pyelftools, Keystone та залежностями. Python-залежності й bootstrap зафіксовано SHA-256 у `tools/pwn/*.lock`; системні пакети отримують оновлення з apt-репозиторію Ubuntu. `pwn status` показує фактичний стан і версії Python-пакетів.

На Ubuntu/Linux поза Windows можна встановити `tools/pwn/system.sh` через sudo, потім `tools/pwn/setup.sh` як звичайний користувач. CLI `cyberstrike pwn setup` робить ті самі кроки, якщо доступний `sudo -n`. Якщо пароль sudo потрібен, виконайте системний крок у власному терміналі.

## 3. Режим CyberStrike та Claude

```powershell
Set-Location D:\CTF\challenge
cyberstrike --agent pwn
# Для native Claude Code за його підпискою:
cyberstrike claude --agent pwn --model sonnet
```

Вкажіть файли, віддалений CTF-сервіс, правила та бюджет запитів. Режим зберігає вибраний effort, використовує локальні матеріали відповідної техніки й не підмішує web reconnaissance/VRT. Стандартний `solve` потребує відновлення кандидата й незалежної перевірки; повний семифазний `report` доступний за запитом. Етапи: intake, classification, model, attack, recovery, verification, writeup. Записи методики є твердженнями з файлами доказів, а не автоматичним доказом успішного exploit.

| Інструмент | Призначення |
| --- | --- |
| `pwn_environment` | Статус або погоджене встановлення Linux-оточення |
| `pwn_reference` | Пошук/читання лише потрібних локальних розділів |
| `pwn_run` | Python solver, ELF triage, binutils, gadgets, cyclic, QEMU, batch GDB |
| `pwn_debug` | Зв'язка QEMU user-mode + GDB-multiarch із логами й завершенням власного процесу |
| `pwn_methodology` | Пакетні етапи, докази та SHA-256 артефактів |

Початковий експеримент має 30 с, встановлений solve/verify — 120 с; більші бюджети в інструменті потребують обґрунтування прогресом. У конфігурації `pwn` доступні `workflow`, `experiment_timeout_seconds`, `solver_timeout_seconds`, `context_target_tokens` і `distribution`. Непродуктивні незмінені перевірки повторно не запускаються.

## 4. Ті самі інструменти для Codex

На іншій машині встановіть також оновлений `codex-skills/cyberstrike/SKILL.md` до `~/.codex/skills/cyberstrike/SKILL.md`, порівнявши з власними змінами, якщо скіл уже є. Відкрийте новий чат Codex і викличте `$cyberstrike`. Інструменти й база знань залишаються в повному клоні/збірці CyberStrike; сам скіл їх не дублює.

Скіл `cyberstrike` в Codex спершу визначає категорію й читає відповідні локальні матеріали, потім користується власними file/shell tools та CLI CyberStrike. Це не створює додаткового запиту моделі CyberStrike:

```powershell
cyberstrike knowledge list --category pwn
cyberstrike knowledge search "stack canary ROP" --category pwn --limit 5
cyberstrike knowledge read overflow-basics --category pwn --start-line 1 --lines 120
cyberstrike pwn status
cyberstrike pwn inspect .\challenge
cyberstrike pwn run .\exploit.py -- --local
```

Для crypto замініть категорію на `cryptography`, наприклад `cyberstrike knowledge search "RSA shared prime" --category cryptography`. Інші категорії з існуючої `.cyberstrike/skill` читаються безпосередньо через пошук файлів; CLI knowledge наразі індексує crypto та pwn. Піновані посібники не є інсталяційними інструкціями для всіх категорій.

## 5. QEMU + GDB з PowerShell або Codex

Покладіть у каталог задачі ELF і переглянутий `trace.gdb`, наприклад:

```gdb
break main
continue
info registers
x/12i $pc
bt
```

Запуск:

```powershell
cyberstrike pwn debug .\challenge --arch aarch64 --sysroot /usr/aarch64-linux-gnu --gdb-script .\trace.gdb --timeout 30
```

Для статично зібраного ELF sysroot не потрібний. Для x86-64 можна використати `--arch amd64`; за відсутності `--arch` backend читає заголовок ELF. Для точного двійкового stdin додайте `--stdin-file .\payload.bin`. Аргументи програми передавайте після `--`. Без GDB-скрипта інструмент зупиняється на вході й показує регістри, інструкції та backtrace.

У `pwn-debug-<id>` залишаються GDB-команди, stdout/stderr QEMU та GDB. QEMU >= 10 використовує приватний Unix socket; для старих версій потрібний приватний network namespace (`unshare -Urn`). За відсутності такої можливості backend повідомляє помилку й не виставляє зовнішній порт GDB. Після завершення або таймауту його власний QEMU-процес прибирається. [QEMU user-mode](https://www.qemu.org/docs/master/user/main.html), [QEMU GDB](https://www.qemu.org/docs/master/system/gdb.html).

QEMU user-mode не запускає PE і не емулює kernel VM. Для Windows PE потрібен відповідний WinDbg/x64dbg у дозволеній Windows-лабораторії; для kernel CTF — надані ядро/образ і qemu-system launch script. Встановлений `qemu-system-x86_64` можна викликати через `wsl -d Ubuntu --exec ...` із параметрами задачі; автоматичний `pwn debug` працює з user-mode ELF. WSL і QEMU не є захисними sandbox для недовірених програм.
