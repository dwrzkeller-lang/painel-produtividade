@echo off
rem Abre o Painel de Produtividade em modo demonstracao (Windows).
rem Nao precisa instalar nada: usa o PowerShell do proprio Windows.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\servidor-local.ps1"
