# skyboy installer for Windows: fetches the right release binary from GitHub
# Releases and puts it on your PATH.
# irm https://skyboy.in/install.ps1 | iex

$ErrorActionPreference = "Stop"

$Repo = "aijadugar/skyboy"
$InstallDir = if ($env:SKYBOY_INSTALL_DIR) { $env:SKYBOY_INSTALL_DIR } else { "$env:LOCALAPPDATA\Programs\skyboy" }

$Arch = switch ($env:PROCESSOR_ARCHITECTURE) {
    "ARM64" { "arm64" }
    default { "amd64" }
}

$Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
$Tag = $Release.tag_name
$Url = "https://github.com/$Repo/releases/download/$Tag/skyboy-windows-$Arch.exe"

Write-Host "skyboy install: downloading $Url"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$Dest = Join-Path $InstallDir "skyboy.exe"
Invoke-WebRequest -Uri $Url -OutFile $Dest

# Add to the user PATH when not already present.
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (($UserPath -split ";") -notcontains $InstallDir) {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    Write-Host "skyboy install: added $InstallDir to your PATH (open a new terminal to pick it up)."
}

Write-Host "skyboy install: done. Run 'skyboy help' to start."
