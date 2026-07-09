# check_claim.ps1 — Claim durumunu sorgular
$creds = Get-Content "$PSScriptRoot\..\credentials.json" | ConvertFrom-Json
$apiKey = $creds.api_key

try {
    $response = Invoke-WebRequest -Uri "https://www.moltbook.com/api/v1/agents/status" `
        -Method GET `
        -Headers @{ Authorization = "Bearer $apiKey" } `
        -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Durum    : $($data.status)"
    Write-Host "Ajan     : $($data.name)"
    Write-Host "Sahip    : $($data.owner)"
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Hata: $($reader.ReadToEnd())"
}
