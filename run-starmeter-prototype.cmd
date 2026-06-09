@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-starmeter-prototype.ps1" -HostName 0.0.0.0
