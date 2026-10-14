@echo off
set "CYBERSTRIKE_BIN=%~dp0..\packages\cyberstrike\dist-windows\cyberstrike-windows-x64\bin\cyberstrike.exe"
if not exist "%CYBERSTRIKE_BIN%" (
  echo CyberStrike CTF executable is missing. Run script\build-windows.ps1 from the checkout.
  exit /b 1
)
"%CYBERSTRIKE_BIN%" %*
exit /b %ERRORLEVEL%
