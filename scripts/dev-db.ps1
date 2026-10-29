$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pg = 'C:\Program Files\PostgreSQL\17\bin'
$dataDir = Join-Path $root '.pgdata'
$cmd = $args[0]

switch ($cmd) {
  'start' {
    $pidFile = Join-Path $dataDir 'postmaster.pid'
    if (Test-Path $pidFile) {
      $lines = Get-Content $pidFile -ErrorAction SilentlyContinue
      if ($lines -and $lines.Count -ge 1) {
        $oldPid = [int]$lines[0]
        $proc = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
        if (-not $proc) {
          Write-Host "Removing stale postmaster.pid (PID $oldPid not running)..."
          Remove-Item $pidFile -Force
        }
      }
    }
    Start-Process -FilePath (Join-Path $pg 'postgres.exe') `
      -ArgumentList '-D', $dataDir, '-p', '5434' -WindowStyle Hidden
    Start-Sleep -Seconds 3
    & (Join-Path $pg 'pg_isready.exe') -U jioplix -p 5434
  }
  'stop' {
    & (Join-Path $pg 'pg_ctl.exe') -D $dataDir stop -m fast
  }
  'status' {
    & (Join-Path $pg 'pg_isready.exe') -U jioplix -p 5434
  }
  default {
    Write-Host "Usage: .\scripts\dev-db.ps1 <start|stop|status>"
  }
}
