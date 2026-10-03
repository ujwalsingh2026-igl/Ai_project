param([string]$Message = "Explain what a Python list is, in simple words")
$base = "http://127.0.0.1:8001"
$user = Read-Host "Username"
$pw = Read-Host "Password" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw)
try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
Write-Host "Step 1: logging in..."
try {
    $resp = Invoke-RestMethod -Method Post -Uri "$base/api/auth/token/" -Body 
} catch {
    Write-Host "LOGIN FAILED"
    Write-Host $_.ErrorDetails.Message
    Write-Host $_.Exception.Message
    return
}
Write-Host "Login OK"
Write-Host "Step 2: sending message (first time can take a few minutes)..."
$headers = @{Authorization = "Token $($resp.token)"}
$body = @{message=$Message} | ConvertTo-Json
try {
    $r = Invoke-RestMethod -Method Post -Uri "$base/api/assistant/chat/" -Heade
} catch {
    Write-Host "CHAT FAILED"
    Write-Host $_.ErrorDetails.Message
    Write-Host $_.Exception.Message
    return
}
$r.reply.content
"---"
$r.reply.metadata | ConvertTo-Json
