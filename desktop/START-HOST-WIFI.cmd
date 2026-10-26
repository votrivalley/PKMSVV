@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 (
 echo.
 echo THIEU NODE.JS. Can cai Node.js LTS de chay Host LAN bang trinh duyet.
 echo https://nodejs.org/
 pause
 exit /b 1
)
echo Mo Co-op LAN bang trinh duyet. Giu cua so nay mo khi choi.
node.exe "%~dp0desktop\lan-browser-host.cjs"
if errorlevel 1 (
 echo.
 echo Khoi dong Host khong thanh cong. Kiem tra tai nguyen va cong LAN.
 pause
)
