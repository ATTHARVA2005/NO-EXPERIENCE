# Fix all "students" table references to "student_profiles"
Write-Host "Fixing table name references from students to student_profiles..." -ForegroundColor Cyan

$files = @(
    "app\(auth)\login\page.tsx",
    "app\api\tutor\chat\route.ts",
    "app\api\assignment\generate-adaptive\route.ts",
    "app\api\assignment\generate\route.ts",
    "app\dashboard\learn\page.tsx",
    "app\dashboard\overview\page.tsx",
    "app\dashboard\curriculum-builder\page.tsx",
    "app\dashboard\profile\page.tsx",
    "app\api\feedback\comprehensive\route.ts",
    "app\api\auth\callback\route.ts",
    "app\api\auth\setup\route.ts",
    "app\api\auth\setup-test-account\route.ts",
    "app\api\student\profile\route.ts",
    "app\api\setup\route.ts",
    "app\api\recommendations\route.ts"
)

$count = 0
foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        $newContent = $content -replace 'from\("students"\)', 'from("student_profiles")'
        
        if ($content -ne $newContent) {
            Set-Content $fullPath $newContent -NoNewline
            Write-Host "Fixed: $file" -ForegroundColor Green
            $count++
        } else {
            Write-Host "Skipped: $file (no changes needed)" -ForegroundColor Gray
        }
    } else {
        Write-Host "Not found: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Fixed $count files!" -ForegroundColor Green
Write-Host "Now restart your dev server: pnpm dev" -ForegroundColor Yellow
