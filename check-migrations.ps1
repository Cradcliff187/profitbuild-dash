# CRITICAL: Migration Validation Script
# 
# This script validates that ALL database migrations have corresponding local files
# with the exact filename format: {version}_{name}.sql
#
# Usage:
#   1. Query database: SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
#   2. Pass migrations as parameter or modify $dbMigrations array below
#
# WARNING: The hardcoded migrations below are ONLY for testing!
# In production, ALWAYS query the database for ALL migrations (typically 297+)

param(
    [Parameter(ValueFromPipeline=$true)]
    [object[]]$Migrations
)

# If migrations provided via parameter, use them
if ($Migrations -and $Migrations.Count -gt 0) {
    $dbMigrations = $Migrations | ForEach-Object {
        if ($_.version -and $_.name) {
            @{version=$_.version; name=$_.name}
        } elseif ($_.PSObject.Properties['version']) {
            @{version=$_.version; name=$_.name}
        }
    }
    Write-Host "Using $($dbMigrations.Count) migrations from parameter" -ForegroundColor Cyan
} else {
    # FALLBACK: Hardcoded migrations (WARNING: Only for testing!)
    # In production, ALWAYS query database for ALL migrations
    Write-Host "⚠️  WARNING: Using hardcoded migrations. This is INCOMPLETE!" -ForegroundColor Yellow
    Write-Host "CRITICAL: Query database and pass migrations via -Migrations parameter" -ForegroundColor Red
    Write-Host ""
    Write-Host "To get all migrations, run:" -ForegroundColor Yellow
    Write-Host "  SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;" -ForegroundColor Cyan
    Write-Host ""
    
    $dbMigrations = @(
        @{version="20260123134120"; name="dfd655c2-ad80-4e8a-86bf-b13c38211633"},
        @{version="20260123134433"; name="ee649696-cb93-4de4-b8ce-8300a8c265bc"},
        @{version="20260123140238"; name="9d936881-6393-4427-9ba3-2a5b42a2de53"},
        @{version="20260123141818"; name="b6a438b8-452f-4472-aba2-8e10f0e8cf6b"},
        @{version="20260123143417"; name="d82792a2-811c-4119-958e-40838a9daf8c"},
        @{version="20260123144833"; name="f835934e-eaec-4300-8a67-b12e918fbeed"}
    )
}

Write-Host "Validating $($dbMigrations.Count) database migrations..." -ForegroundColor Cyan
Write-Host ""

$missingFiles = @()
$validatedCount = 0

foreach ($migration in $dbMigrations) {
    $version = $migration.version
    $name = $migration.name
    
    # Expected filename based on whether name is empty
    if ([string]::IsNullOrEmpty($name)) {
        $expectedFile = "${version}_migration.sql"
    } else {
        $expectedFile = "${version}_${name}.sql"
    }
    
    $fullPath = "supabase/migrations/$expectedFile"
    
    if (!(Test-Path $fullPath)) {
        $missingFiles += @{
            version = $version
            name = $name
            expectedFile = $expectedFile
            fullPath = $fullPath
        }
        Write-Host "❌ MISSING: $expectedFile" -ForegroundColor Red
    } else {
        Write-Host "✓ EXISTS: $expectedFile" -ForegroundColor Green
        $validatedCount++
    }
}

Write-Host ""
if ($missingFiles.Count -gt 0) {
    Write-Host "❌ FAILED: Found $($missingFiles.Count) missing migration files!" -ForegroundColor Red
    Write-Host "These need to be created to align with the database." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Missing files:" -ForegroundColor Red
    $missingFiles | ForEach-Object {
        Write-Host "  - $($_.expectedFile)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Total validated: $validatedCount / $($dbMigrations.Count)" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ SUCCESS: All $($dbMigrations.Count) migration files exist!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  NOTE: If database has more than $($dbMigrations.Count) migrations," -ForegroundColor Yellow
    Write-Host "   query ALL migrations and pass them via -Migrations parameter." -ForegroundColor Yellow
    exit 0
}
