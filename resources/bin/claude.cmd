@echo off
:: claude.cmd - Wrapper that injects --teammate-mode tmux for Claude Code Agent Teams
:: This file is prepended to PATH by copilot-terminal's tmux compat layer.
:: It intercepts "claude" calls and appends --teammate-mode tmux.

:: Find the real claude.exe by removing our shim dir from PATH
setlocal EnableDelayedExpansion

set "SHIM_DIR=%~dp0"
:: Remove trailing backslash
set "SHIM_DIR=%SHIM_DIR:~0,-1%"

:: Build a clean PATH without our shim directory
set "CLEAN_PATH="
for %%P in ("%PATH:;=";"%) do (
    set "ITEM=%%~P"
    if /i not "!ITEM!"=="!SHIM_DIR!" (
        if defined CLEAN_PATH (
            set "CLEAN_PATH=!CLEAN_PATH!;!ITEM!"
        ) else (
            set "CLEAN_PATH=!ITEM!"
        )
    )
)

:: Find the real claude executable
set "REAL_CLAUDE="
for %%E in (claude.exe claude.cmd claude.bat) do (
    set "FOUND="
    for /f "delims=" %%F in ('where /p "!CLEAN_PATH!" %%E 2^>nul') do (
        set "FOUND=%%F"
        goto :found
    )
)

:found
if defined FOUND set "REAL_CLAUDE=!FOUND!"

if not defined REAL_CLAUDE (
    :: Fallback: try PATH without shim dir via temporary PATH swap
    set "PATH=!CLEAN_PATH!"
    where claude.exe >nul 2>&1
    if !errorlevel! equ 0 (
        set "REAL_CLAUDE=claude.exe"
    ) else (
        where claude >nul 2>&1
        if !errorlevel! equ 0 (
            set "REAL_CLAUDE=claude"
        )
    )
)

if not defined REAL_CLAUDE (
    echo claude.cmd: Cannot find real claude executable 1>&2
    exit /b 1
)

:: Check if --teammate-mode is already in args to avoid double injection
set "HAS_TEAMMATE_MODE=0"
for %%A in (%*) do (
    if "%%A"=="--teammate-mode" set "HAS_TEAMMATE_MODE=1"
    if "%%A"=="--teammate-mode=tmux" set "HAS_TEAMMATE_MODE=1"
)

if "!HAS_TEAMMATE_MODE!"=="1" (
    :: Already has teammate mode, just pass through
    "!REAL_CLAUDE!" %*
) else (
    :: Inject --teammate-mode tmux
    "!REAL_CLAUDE!" %* --teammate-mode tmux
)

exit /b %errorlevel%
