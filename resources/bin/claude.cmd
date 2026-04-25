@echo off
setlocal EnableDelayedExpansion
set "SHIM_DIR=%~dp0"
set "SHIM_DIR=!SHIM_DIR:~0,-1!"

set "CLEAN_PATH="
for %%P in ("%PATH:;=";"%") do (
    set "ITEM=%%~P"
    if /i not "!ITEM!"=="!SHIM_DIR!" (
        if defined CLEAN_PATH (
            set "CLEAN_PATH=!CLEAN_PATH!;!ITEM!"
        ) else (
            set "CLEAN_PATH=!ITEM!"
        )
    )
)
set "PATH=!CLEAN_PATH!"

:: Find real claude (could be .exe, .cmd, or .bat from npm)
set "FOUND="
for %%E in (claude.cmd claude.exe claude.bat) do (
    for /f "delims=" %%F in ('where %%E 2^>nul') do (
        if /i not "%%~dpF"=="!SHIM_DIR!\" (
            set "FOUND=%%F"
            goto FoundClaude
        )
    )
)

:FoundClaude
if not defined FOUND (
    endlocal
    echo claude.cmd: Cannot find real claude executable 1>&2
    exit /b 1
)
endlocal & set "FOUND=%FOUND%"
set "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"
set "PSMUX_CLAUDE_TEAMMATE_MODE=tmux"
set "CLAUDE_CODE_HOST_PLATFORM=linux"

set "HAS_TEAMMATE_MODE=0"
for %%A in (%*) do (
    if /i "%%~A"=="--teammate-mode" set "HAS_TEAMMATE_MODE=1"
    if /i "%%~A"=="--teammate-mode=tmux" set "HAS_TEAMMATE_MODE=1"
)

if "%HAS_TEAMMATE_MODE%"=="1" goto RunClaudePassthrough
goto RunClaudeInjected

:RunClaudeInjected
set "LOGFILE=%AUSOME_TMUX_LOG_FILE%"
if defined LOGFILE goto LogInjected
set "LOGFILE=%TEMP%\copilot-terminal-tmux-debug.log"
:LogInjected
if "%AUSOME_TMUX_DEBUG%"=="1" >>"%LOGFILE%" echo [claude.cmd %DATE% %TIME%] real=%FOUND% tmux=%TMUX% tmuxPane=%TMUX_PANE% host=%CLAUDE_CODE_HOST_PLATFORM% args=--teammate-mode tmux %*
call "%FOUND%" --teammate-mode tmux %*
exit /b %errorlevel%

:RunClaudePassthrough
set "LOGFILE=%AUSOME_TMUX_LOG_FILE%"
if defined LOGFILE goto LogPassthrough
set "LOGFILE=%TEMP%\copilot-terminal-tmux-debug.log"
:LogPassthrough
if "%AUSOME_TMUX_DEBUG%"=="1" >>"%LOGFILE%" echo [claude.cmd %DATE% %TIME%] real=%FOUND% tmux=%TMUX% tmuxPane=%TMUX_PANE% host=%CLAUDE_CODE_HOST_PLATFORM% args=%*
call "%FOUND%" %*
exit /b %errorlevel%
