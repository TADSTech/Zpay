bun run build

# Start Cloudflare Tunnel in a new PowerShell window
Write-Host "Spinning up Cloudflare Tunnel (zpay.tadstech.dev)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cloudflared tunnel run --url http://localhost:3000 --protocol http2 zpay-tunnel"

# Start the local Bun server in the current window
Write-Host "Starting Bun payment server on http://localhost:3000..." -ForegroundColor Green
bun run start
