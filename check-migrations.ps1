# Parse database migrations from JSON output
$dbMigrations = @(
    @{version="20260123134120"; name="dfd655c2-ad80-4e8a-86bf-b13c38211633"},
    @{version="20260123134433"; name="ee649696-cb93-4de4-b8ce-8300a8c265bc"},
    @{version="20260123140238"; name="9d936881-6393-4427-9ba3-2a5b42a2de53"},
    @{version="20260123141818"; name="b6a438b8-452f-4472-aba2-8e10f0e8cf6b"},
    @{version="20260123143417"; name="d82792a2-811c-4119-958e-40838a9daf8c"},
    @{version="20260123144833"; name="f835934e-eaec-4300-8a67-b12e918fbeed"}
)

$missingFiles = @()

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
        Write-Host "MISSING: $expectedFile" -ForegroundColor Red
    } else {
        Write-Host "EXISTS: $expectedFile" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`nFound $($missingFiles.Count) missing migration files!" -ForegroundColor Red
    Write-Host "These need to be created to align with the database." -ForegroundColor Yellow
} else {
    Write-Host "`nAll migration files exist!" -ForegroundColor Green
}
