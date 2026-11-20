# Стеганографія у CyberStrike

Режим `stego` шукає приховані дані в локальних артефактах CTF. Він починає зі структури файла, а потім перевіряє біт або спектрограму, якщо на це вказують умова чи метадані. Потрібна збірка **1.1.16-ctf.11** або новіша. Аналіз вбудований у CLI. Окремі Python, WSL, завантаження інструментів і запит до моделі для цих команд не потрібні.

```powershell
cyberstrike stego status
cyberstrike stego inspect .\picture.png
cyberstrike stego bytes .\picture.png --offset 0 --length 32
cyberstrike knowledge search 'PNG alpha bit plane' --category stego
cyberstrike stego bits .\picture.png --channels a --bit 0 --order msb --bytes 64
cyberstrike stego bits .\sound.wav --channels 0 --offset 0 --bytes 64
cyberstrike stego spectrum .\sound.wav --out .\spectrum.png
```

Перед запуском виберіть папку задачі. `inspect` повертає SHA‑256, сигнатуру, список чанків PNG чи WAV, підказки у відкритому тексті й ознаки даних після кінця контейнера. У `bits` параметр `--offset` рахується у пікселях або аудіокадрах. `spectrum` створює новий PNG і залишає наявні файли на місці. Параметри `--start` і `--duration` задаються в секундах.

```powershell
cyberstrike --agent stego
cyberstrike claude --agent stego
```

У режимі CyberStrike доступні `stego_inspect`, `stego_bytes`, `stego_bits`, `stego_spectrum` і `stego_reference`. Claude Code отримує ці самі інструменти через MCP. У звичайному Claude Code та Codex можна викликати локальний CLI зі скілу CyberStrike. Модель та effort вибирає користувач.

| Формат | Підтримка |
| --- | --- |
| PNG | Чанки, CRC і хвіст. Біти статичних 8-бітних grayscale, grayscale-alpha, RGB та RGBA без чергування рядків. |
| RIFF/WAV | Чанки й хвіст. Біти та спектрограми для цілочисельного PCM з одним чанком `data`. |
| JPEG, GIF, BMP, FLAC, Ogg, ZIP | Визначення за сигнатурою. Декодери цих форматів не включено. |

Граничний розмір вхідного файла — 32 МіБ. Розпаковані дані PNG обмежено 16 МіБ, а результат одного запуску `bits` — 512 байт. Сигнатура хвоста лише підказує його можливий формат. Файли, знайдені всередині артефакту, не виконуються й не розпаковуються автоматично.

Чотири локальні методички охоплюють первинну діагностику, PNG, WAV і підтвердження результату. Відкрий потрібну через `cyberstrike knowledge read png --category stego`. Джерела [специфікація PNG](https://www.w3.org/TR/png/) і [формат RIFF/WAVE](https://learn.microsoft.com/en-us/windows/win32/xaudio2/resource-interchange-file-format--riff-).
