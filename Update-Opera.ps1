param([Parameter(Mandatory=$true)][string]$Target)
$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$targetRoot = [IO.Path]::GetFullPath($Target).TrimEnd('\','/')
if ($targetRoot -eq $sourceRoot) { throw 'Extract the update separately from the installation you are updating.' }
if (!(Test-Path -LiteralPath (Join-Path $targetRoot 'opera.mjs')) -or !(Test-Path -LiteralPath (Join-Path $targetRoot 'package.json'))) { throw 'Target must be an existing opera-terminal installation.' }
$manifest = Get-Content -LiteralPath (Join-Path $sourceRoot 'application-manifest.json') -Raw | ConvertFrom-Json
function Safe-ApplicationPath([string]$base, [string]$relative) {
    if ([IO.Path]::IsPathRooted($relative)) { throw "Absolute manifest path: $relative" }
    $parts = $relative -split '[/\\]'
    $allowed = @('.pi','tests','examples','AGENTS.md','README.md','GUIDE.md','DESIGN.md','VALIDATION.md','opera.mjs','package.json','package-lock.json','tsconfig.json','.gitignore','Update-Opera.ps1','application-manifest.json')
    if ($parts[0] -notin $allowed) { throw "Not an application path: $relative" }
    if ($parts -contains '..') { throw "Traversal in manifest: $relative" }
    $resolved = [IO.Path]::GetFullPath((Join-Path $base $relative))
    if (!$resolved.StartsWith($base.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw "Path outside target: $resolved" }
    return $resolved
}
# Validate every source and target before changing any installed files.
foreach ($entry in $manifest.files) {
    $from = Safe-ApplicationPath $sourceRoot $entry.path
    $null = Safe-ApplicationPath $targetRoot $entry.path
    if (!(Test-Path -LiteralPath $from -PathType Leaf)) { throw "Missing update file: $from" }
    if ((Get-FileHash -LiteralPath $from -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw "Update checksum mismatch: $from" }
}
foreach ($relative in $manifest.obsolete) { $null = Safe-ApplicationPath $targetRoot $relative }
$backupRoot = Join-Path (Split-Path -Parent $targetRoot) ('opera-application-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8))
$null = New-Item -ItemType Directory -Path $backupRoot
$affected = @($manifest.files | ForEach-Object { $_.path }) + @($manifest.obsolete) + @('application-manifest.json')
foreach ($relative in ($affected | Select-Object -Unique)) {
    $installed = Safe-ApplicationPath $targetRoot $relative
    if (Test-Path -LiteralPath $installed -PathType Leaf) {
        $saved = Safe-ApplicationPath $backupRoot $relative
        $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $saved)
        Copy-Item -LiteralPath $installed -Destination $saved
    }
}
foreach ($relative in $manifest.obsolete) {
    $installed = Safe-ApplicationPath $targetRoot $relative
    if (Test-Path -LiteralPath $installed -PathType Leaf) { Remove-Item -LiteralPath $installed -Force }
}
foreach ($entry in $manifest.files) {
    $from = Safe-ApplicationPath $sourceRoot $entry.path
    $to = Safe-ApplicationPath $targetRoot $entry.path
    $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $to)
    Copy-Item -LiteralPath $from -Destination $to -Force
}
Copy-Item -LiteralPath (Join-Path $sourceRoot 'application-manifest.json') -Destination (Join-Path $targetRoot 'application-manifest.json') -Force
Write-Output "OPERA updated. Application backup: $backupRoot"
Write-Output 'Learner data, notes, provider configuration and Pi history were preserved. Run npm ci in the target folder for updated source-reader dependencies, then restart OPERA.'
