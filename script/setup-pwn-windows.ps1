[CmdletBinding()]
param(
    [string]$Distribution = 'Ubuntu',
    [switch]$SkipSystemPackages
)
$ErrorActionPreference = 'Stop'
if ($Distribution -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$') { throw 'Invalid distribution name.' }
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$wsl = Join-Path $env:WINDIR 'System32\wsl.exe'
function Read-Wsl([string[]]$Arguments) {
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $wsl
    $info.Arguments = $Arguments -join ' '
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = [Text.Encoding]::Unicode
    $info.StandardErrorEncoding = [Text.Encoding]::Unicode
    $process = [Diagnostics.Process]::Start($info)
    $output = $process.StandardOutput.ReadToEnd()
    $errors = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    return @{ Code = $process.ExitCode; Output = $output; Errors = $errors }
}
if (-not (Test-Path -LiteralPath $wsl)) {
    throw 'WSL is unavailable. Install/update WSL as administrator: wsl --install --no-distribution; restart Windows, then rerun this script. See docs/pwn.uk.md.'
}
$available = Read-Wsl @('--list', '--quiet')
$names = @($available.Output -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($available.Code -ne 0 -or $names -notcontains $Distribution) {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "WSL/Ubuntu needs installation. Open PowerShell as Administrator and rerun this script, or run: wsl --install -d $Distribution --no-launch --web-download"
    }
    & $wsl --install -d $Distribution --no-launch --web-download
    $installCode = $LASTEXITCODE
    if ($installCode -notin @(0, 3010)) { throw "WSL installation returned $installCode. See docs/pwn.uk.md." }
    Write-Host "If Windows requests a restart, restart it yourself. Then run: wsl -d $Distribution"
    Write-Host 'Create the Linux username/password in that first-run window, exit Ubuntu, then rerun this script from your normal Windows account.'
    exit $installCode
}
$identity = & $wsl -d $Distribution --exec id -un
if ($LASTEXITCODE -ne 0) { throw "Initialize Ubuntu first: wsl -d $Distribution; then retry." }
if (($identity -join '').Trim() -eq 'root') { throw "Ubuntu's default user is root. Create/select a normal Linux user first; see docs/pwn.uk.md." }
$versions = Read-Wsl @('--list', '--verbose')
$row = $versions.Output -split "`r?`n" | Where-Object { $_ -match ('^\s*\*?\s*' + [regex]::Escape($Distribution) + '\s+') }
if ($row -match '\s1\s*$') { throw "This distribution uses WSL1. Convert it explicitly: wsl --set-version $Distribution 2; then retry." }
# Ask WSL itself to translate paths; do not assume C: or a default mount point.
$system = & $wsl -d $Distribution --exec wslpath -a -u (Join-Path $root 'tools\pwn\system.sh')
if ($LASTEXITCODE -ne 0) { throw 'Could not translate the installer path into WSL.' }
$setup = & $wsl -d $Distribution --exec wslpath -a -u (Join-Path $root 'tools\pwn\setup.sh')
if ($LASTEXITCODE -ne 0) { throw 'Could not translate the environment path into WSL.' }
if (-not $SkipSystemPackages) {
    & $wsl -d $Distribution --user root --exec /bin/sh ($system -join '').Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Ubuntu system package installation failed.' }
}
& $wsl -d $Distribution --exec /bin/sh ($setup -join '').Trim()
if ($LASTEXITCODE -ne 0) { throw 'Pwn Python environment installation failed.' }
Write-Host "Pwn tooling installed in $Distribution. Build CyberStrike, then run: cyberstrike pwn status --distribution $Distribution"
