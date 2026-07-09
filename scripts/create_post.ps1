# create_post.ps1 — Kullanici onayiyla post atar
param(
    [Parameter(Mandatory)][string]$Submolt,
    [Parameter(Mandatory)][string]$Title,
    [Parameter(Mandatory)][string]$Content
)
$creds = Get-Content "$PSScriptRoot\..\credentials.json" | ConvertFrom-Json
$apiKey = $creds.api_key

Write-Host "=== GONDERILECEK POST (ONAY BEKLENİYOR) ==="
Write-Host "Submolt : $Submolt"
Write-Host "Baslik  : $Title"
Write-Host "Icerik  : $Content"
Write-Host ""
$confirm = Read-Host "Gondermek icin 'EVET' yazin"
if ($confirm -ne "EVET") {
    Write-Host "Iptal edildi."
    exit 0
}

$body = @{ submolt = $Submolt; title = $Title; content = $Content } | ConvertTo-Json -Compress

try {
    $response = Invoke-WebRequest -Uri "https://www.moltbook.com/api/v1/posts" `
        -Method POST `
        -Headers @{ Authorization = "Bearer $apiKey" } `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Post atildi. ID: $($data.post.id)"
    Add-Content -Path "$PSScriptRoot\..\logs\posts.log" -Value "$(Get-Date -Format 'u') | $($data.post.id) | $Title"
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Hata: $($reader.ReadToEnd())"
}
