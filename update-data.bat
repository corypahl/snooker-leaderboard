@echo off
echo ========================================
echo   Snooker Tournament Data Updater
echo ========================================
echo.
echo Fetching latest tournament data...
echo.

node fetch-data.js

echo.
echo ========================================
echo   Data update complete!
echo ========================================
echo.
echo Please refresh your browser to see the latest results.
echo.
pause
