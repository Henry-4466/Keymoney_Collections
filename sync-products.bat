@echo off
title KEYMONEYS COLLECTION - Product Sync Tool
color 0A

echo ========================================
echo    KEYMONEYS COLLECTION
echo    PRODUCT SYNC TOOL
echo ========================================
echo.
echo This tool will copy products from Admin
echo folder to your main store folder.
echo.

cd /d "C:\Users\henry\OneDrive\Desktop\Keymoney_Collections"

if exist "Admin\KEYMONEYS_COLLECTION_products.json" (
    echo ✅ Found admin products file!
    echo.
    echo Copying products...
    copy /Y "Admin\KEYMONEYS_COLLECTION_products.json" "products.json"
    echo.
    echo ✅ Products synced successfully!
    echo.
    echo 📦 Products are now available in your store.
    echo 🔄 Refresh your browser to see changes.
) else (
    echo ❌ ERROR: Could not find admin products file.
    echo.
    echo Make sure you are in the correct folder.
    echo Current location: %cd%
    echo.
    echo Expected location: C:\Users\henry\OneDrive\Desktop\Keymoney_Collections
)

echo.
echo Press any key to exit...
pause > nul