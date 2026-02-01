
@echo off
title Neon Player - Build Web
color 0b

echo ==================================================
echo      NEON RETRO PLAYER - WEB BUILD
echo ==================================================
echo.
echo This command compiles the project into static files
echo located in the 'dist' folder.
echo.
echo Running 'npm run build'...
echo.

call npm run build

if %errorlevel% neq 0 (
    color 0c
    echo.
    echo ==================================================
    echo      BUILD FAILED
    echo ==================================================
    pause
    exit
)

color 0a
echo.
echo ==================================================
echo      BUILD SUCCESSFUL!
echo ==================================================
echo Files are ready in the 'dist' folder.
echo.
pause
