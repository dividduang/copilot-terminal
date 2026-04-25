# claude.ps1 - Wrapper that injects --teammate-mode tmux for Claude Code Agent Teams
# This file is prepended to PATH by copilot-terminal's tmux compat layer.
# PowerShell prefers .ps1 over .cmd, so this takes precedence over the npm-installed claude.ps1.

$shimDir = $PSScriptRoot

# Find the real claude executable (skip our own directory)
$cleanPath = ($env:PATH -split ';' | Where-Object { $_ -ne $shimDir }) -join ';'
$env:PATH = $cleanPath

$realClaude = Get-Command claude -CommandType Application -ErrorAction SilentlyContinue |
    Where-Object { $_.Source -and (Split-Path $_.Source) -ne $shimDir } |
    Select-Object -First 1

# Restore PATH
$env:PATH = "$shimDir;$cleanPath"

if (-not $realClaude) {
    Write-Error "claude.ps1: Cannot find real claude executable"
    exit 1
}

$env:CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1'
$env:PSMUX_CLAUDE_TEAMMATE_MODE = 'tmux'
$env:CLAUDE_CODE_HOST_PLATFORM = 'linux'

$hasTeammateMode = $false
foreach ($arg in $args) {
    if ($arg -eq '--teammate-mode' -or $arg -like '--teammate-mode=*') {
        $hasTeammateMode = $true
        break
    }
}

$forwardArgs = @()
if (-not $hasTeammateMode) {
    $forwardArgs += '--teammate-mode'
    $forwardArgs += 'tmux'
}
$forwardArgs += $args

if ($env:AUSOME_TMUX_DEBUG -eq '1') {
    $logFile = if ($env:AUSOME_TMUX_LOG_FILE) { $env:AUSOME_TMUX_LOG_FILE } else { Join-Path $env:TEMP 'copilot-terminal-tmux-debug.log' }
    try {
        Add-Content -Path $logFile -Value "[claude.ps1 $(Get-Date -Format o)] real=$($realClaude.Source) tmux=$env:TMUX tmuxPane=$env:TMUX_PANE host=$env:CLAUDE_CODE_HOST_PLATFORM args=$($forwardArgs -join ' ')"
    } catch {}
}

# Call real claude with teammate mode first so Commander parses it before any positional prompt.
& $realClaude.Source @forwardArgs
