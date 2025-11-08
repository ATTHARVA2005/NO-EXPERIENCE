# Quick Start Script for Windows PowerShell
# Run this after setting up .env.local with your API keys

Write-Host "🎓 Starting AI Tutor System Setup..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "✓ Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found! Please install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check if pnpm is installed
Write-Host "✓ Checking pnpm installation..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version
    Write-Host "  pnpm version: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ pnpm not found! Installing..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Check for .env.local
Write-Host "✓ Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    Write-Host "  .env.local found" -ForegroundColor Green
} else {
    Write-Host "  ✗ .env.local not found!" -ForegroundColor Red
    Write-Host "  Creating template .env.local file..." -ForegroundColor Yellow
    
    $envTemplate = @"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Hume AI (Optional)
NEXT_PUBLIC_HUME_API_KEY=your_hume_api_key
NEXT_PUBLIC_HUME_SECRET_KEY=your_hume_secret_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@
    
    $envTemplate | Out-File -FilePath .env.local -Encoding UTF8
    Write-Host "  ⚠ Please edit .env.local with your actual API keys!" -ForegroundColor Yellow
    Write-Host "  See COMPLETE_SETUP_GUIDE.md for instructions" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter after you've configured .env.local"
}

# Install dependencies
Write-Host ""
Write-Host "✓ Installing dependencies..." -ForegroundColor Yellow
pnpm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Check database scripts
Write-Host ""
Write-Host "✓ Checking database migration scripts..." -ForegroundColor Yellow
$scriptFiles = @(
    "scripts/01-schema-setup.sql",
    "scripts/02-seed-test-account.sql",
    "scripts/03-assignment-system-migration.sql"
)

$allScriptsExist = $true
foreach ($script in $scriptFiles) {
    if (Test-Path $script) {
        Write-Host "  $script ✓" -ForegroundColor Green
    } else {
        Write-Host "  $script ✗" -ForegroundColor Red
        $allScriptsExist = $false
    }
}

if ($allScriptsExist) {
    Write-Host ""
    Write-Host "⚠ IMPORTANT: Run database migrations in Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host "  1. Open Supabase Dashboard > SQL Editor" -ForegroundColor White
    Write-Host "  2. Run scripts/01-schema-setup.sql" -ForegroundColor White
    Write-Host "  3. Run scripts/02-seed-test-account.sql" -ForegroundColor White
    Write-Host "  4. Run scripts/03-assignment-system-migration.sql" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter after you've run the database migrations"
}

# Verify TypeScript configuration
Write-Host ""
Write-Host "✓ Verifying TypeScript configuration..." -ForegroundColor Yellow
if (Test-Path tsconfig.json) {
    Write-Host "  tsconfig.json found" -ForegroundColor Green
} else {
    Write-Host "  ✗ tsconfig.json missing" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Make sure .env.local has all your API keys" -ForegroundColor White
Write-Host "  2. Make sure database migrations are completed" -ForegroundColor White
Write-Host "  3. Run: pnpm dev" -ForegroundColor Cyan
Write-Host "  4. Open: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  • Complete Guide: COMPLETE_SETUP_GUIDE.md" -ForegroundColor White
Write-Host "  • Architecture: SYSTEM_ARCHITECTURE.md" -ForegroundColor White
Write-Host "  • Assignment Agent: ASSIGNMENT_AGENT_DOCUMENTATION.md" -ForegroundColor White
Write-Host ""
Write-Host "Test Account:" -ForegroundColor Yellow
Write-Host "  Email: test@example.com" -ForegroundColor White
Write-Host "  Password: testpassword123" -ForegroundColor White
Write-Host ""
Write-Host "Ready to start? Run: pnpm dev" -ForegroundColor Green
Write-Host ""

# Ask if user wants to start dev server
$startServer = Read-Host "Start development server now? (Y/n)"
if ($startServer -eq "" -or $startServer -eq "Y" -or $startServer -eq "y") {
    Write-Host ""
    Write-Host "🚀 Starting development server..." -ForegroundColor Cyan
    Write-Host ""
    pnpm dev
}
