@echo off
:: tmux.cmd - Windows wrapper for tmux-shim.js
:: This file must be on PATH so that "tmux" resolves to this shim.
node "%~dp0tmux-shim.js" %*
exit /b %errorlevel%
