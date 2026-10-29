param(
  [string]$PlaywrightCorePath = $env:PLAYWRIGHT_CORE_PATH,
  [string]$ChromiumPath = $env:PREVIEW_CHROMIUM
)

$ErrorActionPreference = 'Stop'
$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$previewDir = Split-Path -Parent $sourceDir

if (-not $PlaywrightCorePath) {
  $runtimeCandidates = Get-ChildItem -Path (Join-Path $env:USERPROFILE '.cache\codex-runtimes') -Directory -Recurse -Filter 'playwright-core' -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName 'package.json') }
  $PlaywrightCorePath = ($runtimeCandidates | Select-Object -First 1).FullName
}
if (-not $PlaywrightCorePath -or -not (Test-Path $PlaywrightCorePath)) {
  throw 'playwright-core not found. Pass -PlaywrightCorePath or set PLAYWRIGHT_CORE_PATH.'
}

if (-not $ChromiumPath) {
  $chromeCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
  )
  $ChromiumPath = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $ChromiumPath -or -not (Test-Path $ChromiumPath)) {
  $browserRoot = Join-Path $env:LOCALAPPDATA 'ms-playwright'
  $browserCandidates = Get-ChildItem -Path $browserRoot -Directory -Filter 'chromium-*' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    ForEach-Object { Join-Path $_.FullName 'chrome-win64\chrome.exe' } |
    Where-Object { Test-Path $_ }
  $ChromiumPath = $browserCandidates | Select-Object -First 1
}
if (-not $ChromiumPath) { throw 'Chromium browser not found. Pass -ChromiumPath or set PREVIEW_CHROMIUM.' }

$env:PLAYWRIGHT_CORE_PATH = $PlaywrightCorePath
$env:PREVIEW_CHROMIUM = $ChromiumPath
node (Join-Path $sourceDir 'capture.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Preview capture failed.' }

Add-Type -AssemblyName System.Drawing
$expectations = @{
  '00-overview.png' = @(1600, 1000)
  '01-home.png' = @(780, 1688)
  '02-entry.png' = @(780, 1688)
  '03-analysis.png' = @(780, 1688)
  '04-login-join.png' = @(780, 1688)
}
foreach ($entry in $expectations.GetEnumerator()) {
  $file = Join-Path $previewDir $entry.Key
  if (-not (Test-Path $file)) { throw "Missing preview: $($entry.Key)" }
  $image = [System.Drawing.Image]::FromFile($file)
  try {
    if ($image.Width -ne $entry.Value[0] -or $image.Height -ne $entry.Value[1]) {
      throw "Unexpected dimensions for $($entry.Key): $($image.Width)x$($image.Height)"
    }
  } finally {
    $image.Dispose()
  }
}
Write-Host 'Preview capture complete. All output dimensions verified.' -ForegroundColor Green



