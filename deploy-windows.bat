@echo off
echo 🚀 Ronin Reputation Oracle - Deployment Helper
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM 1. Verificar Node.js
echo 1️⃣  Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Install from: https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo ✅ Node.js installed
echo.

REM 2. Verificar npm
echo 2️⃣  Checking npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm not found
    pause
    exit /b 1
)
npm --version
echo ✅ npm installed
echo.

REM 3. Verificar .env
echo 3️⃣  Checking .env configuration...
if not exist .env (
    echo ❌ .env file not found
    pause
    exit /b 1
)
echo ✅ .env file found
echo.

REM 4. Instalar dependencias
echo 4️⃣  Checking dependencies...
if not exist node_modules (
    echo ⚠️  Installing dependencies...
    call npm install
)
echo ✅ Dependencies ready
echo.

REM 5. Compilar
echo 5️⃣  Compiling contracts...
call npm run compile
if %errorlevel% neq 0 (
    echo ❌ Compilation failed
    pause
    exit /b 1
)
echo ✅ Contracts compiled
echo.

REM 6. Menú de deployment
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Select deployment network:
echo 1) Saigon Testnet (recommended)
echo 2) Ronin Mainnet (use real RON)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo 📡 Deploying to SAIGON TESTNET...
    echo.
    echo ⚠️  Make sure you have testnet RON!
    echo Get it from: https://faucet.roninchain.com/
    echo.
    pause
    call npm run deploy:testnet
) else if "%choice%"=="2" (
    echo.
    echo ⚠️  WARNING: Deploying to MAINNET!
    echo This will use REAL RON tokens.
    echo.
    set /p confirm="Are you sure? Type YES to continue: "
    if "%confirm%"=="YES" (
        call npm run deploy:mainnet
    ) else (
        echo Deployment cancelled.
        pause
        exit /b 0
    )
) else (
    echo Invalid choice
    pause
    exit /b 1
)

REM 7. Resultado
if %errorlevel% equ 0 (
    echo.
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo ✅ DEPLOYMENT SUCCESSFUL!
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo 📝 Next steps:
    echo 1. Check deployed-contracts-*.json for contract addresses
    echo 2. Update your backend .env with PROVER_CONTRACT_ADDRESS
    echo 3. Restart your backend server
    echo 4. Test the questionnaire!
    echo.
)

pause