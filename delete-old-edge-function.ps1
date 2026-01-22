# Delete obsolete parse-estimate-import edge function
# Run this script after authenticating with: supabase login

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Delete Obsolete Edge Function" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$version = supabase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI not found. Install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI installed: $version" -ForegroundColor Green
Write-Host ""

# Attempt to delete the function
Write-Host "🗑️  Deleting parse-estimate-import edge function..." -ForegroundColor Yellow
Write-Host ""

$result = supabase functions delete parse-estimate-import --project-ref clsjdxwbsjbhjibvlqbz 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "The obsolete 'parse-estimate-import' edge function has been deleted." -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Cleanup Summary:" -ForegroundColor Cyan
    Write-Host "   • Old AI-based function removed from production" -ForegroundColor White
    Write-Host "   • New deterministic parser active in frontend" -ForegroundColor White
    Write-Host "   • Optional 'enrich-estimate-items' function still available" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ ERROR" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "$result" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Run: supabase login" -ForegroundColor White
    Write-Host "   2. Follow browser authentication flow" -ForegroundColor White
    Write-Host "   3. Re-run this script" -ForegroundColor White
    Write-Host ""
    Write-Host "   OR" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Delete via Supabase Dashboard:" -ForegroundColor White
    Write-Host "   https://supabase.com/dashboard/project/clsjdxwbsjbhjibvlqbz/functions" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
