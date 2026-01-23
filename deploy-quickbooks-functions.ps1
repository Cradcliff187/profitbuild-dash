# Deploy QuickBooks Edge Functions to Supabase
# Run this script from the project root directory

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Deploying QuickBooks Edge Functions" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

# Check if Supabase CLI is installed
try {
    $version = supabase --version 2>&1
    Write-Host "✓ Supabase CLI found: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "  npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nDeploying Edge Functions...`n" -ForegroundColor White

# Deploy each Edge Function
$functions = @(
    "quickbooks-connect",
    "quickbooks-callback",
    "quickbooks-sync-receipt"
)

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Cyan
    supabase functions deploy $func --project-ref clsjdxwbsjbhjibvlqbz
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $func deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to deploy $func" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan
