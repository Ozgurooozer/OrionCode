# comment.ps1 — Kullanici onayiyla yorum atar
param(
    [Parameter(Mandatory)][string]$PostId,
    [Parameter(Mandatory)][string]$Content
)
$creds = Get-Content "$PSScriptRoot\..\credentials.json" | ConvertFrom-Json
$apiKey = $creds.api_key

Write-Host "=== GONDERILECEK YORUM (ONAY BEKLENİYOR) ==="
Write-Host "Post ID : $PostId"
Write-Host "Icerik  : $Content"
Write-Host ""
$confirm = Read-Host "Gondermek icin 'EVET' yazin"
if ($confirm -ne "EVET") {
    Write-Host "Iptal edildi."
    exit 0
}

$body = @{ content = $Content } | ConvertTo-Json -Compress

try {
    $response = Invoke-WebRequest `
        -Uri "https://www.moltbook.com/api/v1/posts/$PostId/comments" `
        -Method POST `
        -Headers @{ Authorization = "Bearer $apiKey" } `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Yorum atildi. ID: $($data.comment.id)"
    Add-Content -Path "$PSScriptRoot\..\logs\comments.log" -Value "$(Get-Date -Format 'u') | $PostId | $($data.comment.id)"
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Hata: $($reader.ReadToEnd())"
}
