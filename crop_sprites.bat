@echo off
REM Sprite Cropping Batch Script for Windows
REM This script crops transparent borders from all PNG sprites in the assets folder

echo RPG Sprite Cropper
echo ==================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Check if PIL/Pillow is available
python -c "import PIL" >nul 2>&1
if errorlevel 1 (
    echo Installing required package: Pillow
    pip install Pillow
    if errorlevel 1 (
        echo Error: Failed to install Pillow
        pause
        exit /b 1
    )
)

echo.
echo What would you like to do?
echo 1. Preview what would be cropped (no changes)
echo 2. Crop all sprites in assets folder (with backup)
echo 3. Crop all sprites in assets folder (no backup)
echo 4. Crop a specific file
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Previewing sprite cropping...
    python crop_sprites.py assets --preview
) else if "%choice%"=="2" (
    echo.
    echo Cropping sprites with backup...
    python crop_sprites.py assets
) else if "%choice%"=="3" (
    echo.
    echo Cropping sprites without backup...
    python crop_sprites.py assets --no-backup
) else if "%choice%"=="4" (
    set /p filepath="Enter path to sprite file: "
    echo.
    echo Cropping specific file...
    python crop_sprites.py "%filepath%"
) else (
    echo Invalid choice
    pause
    exit /b 1
)

echo.
echo Done!
pause