@echo off
setlocal
cd /d "%~dp0"

if exist "TryingOn.exe" (
  echo TryingOn.exe already exists.
  echo You can run TryingOn.exe now.
  pause
  exit /b 0
)

if not exist "exe-parts\TryingOn.exe.part001" goto missing
if not exist "exe-parts\TryingOn.exe.part002" goto missing
if not exist "exe-parts\TryingOn.exe.part003" goto missing

echo Restoring TryingOn.exe ...
copy /b "exe-parts\TryingOn.exe.part001"+"exe-parts\TryingOn.exe.part002"+"exe-parts\TryingOn.exe.part003" "TryingOn.exe" >nul
if errorlevel 1 goto failed

for %%A in ("TryingOn.exe") do set "EXE_SIZE=%%~zA"
if not "%EXE_SIZE%"=="210149888" goto failed

echo Done.
echo You can run TryingOn.exe now.
pause
exit /b 0

:missing
echo Missing exe-parts files. Please download the full repository ZIP again.
pause
exit /b 1

:failed
echo Restore failed. Please delete TryingOn.exe and try again.
pause
exit /b 1
