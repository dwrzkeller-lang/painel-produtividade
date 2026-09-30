# Servidor local da demonstração (Windows, sem instalar nada).
# Abre o Painel de Produtividade em http://localhost:8080 e mantém no ar até
# esta janela ser fechada. Usado por ABRIR-DEMONSTRACAO.bat.
param([int]$Porta = 8080, [switch]$SemNavegador)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'
  '.ico' = 'image/x-icon'; '.woff2' = 'font/woff2'; '.woff' = 'font/woff'; '.txt' = 'text/plain; charset=utf-8'
}
$ouvinte = New-Object System.Net.HttpListener
$prefixo = "http://localhost:$Porta/"
$ouvinte.Prefixes.Add($prefixo)
try { $ouvinte.Start() } catch {
  Write-Host "Nao foi possivel usar a porta $Porta. Feche outro programa que a use ou rode: .\scripts\servidor-local.ps1 -Porta 8090" -ForegroundColor Red
  Read-Host 'Enter para sair'; exit 1
}
Write-Host ''
Write-Host '  Painel de Produtividade - demonstracao' -ForegroundColor Cyan
Write-Host "  No ar em $prefixo  (feche esta janela para parar)" -ForegroundColor Gray
Write-Host ''
if (-not $SemNavegador) { Start-Process $prefixo }
while ($ouvinte.IsListening) {
  $ctx = $ouvinte.GetContext()
  try {
    $caminho = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($caminho -eq '/' -or $caminho -eq '') { $caminho = '/painel.html' }
    $arquivo = [IO.Path]::GetFullPath((Join-Path $raiz ($caminho.TrimStart('/') -replace '/', '\')))
    if ($arquivo.StartsWith($raiz) -and (Test-Path $arquivo -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($arquivo)
      $ext = [IO.Path]::GetExtension($arquivo).ToLower()
      $ctx.Response.ContentType = $(if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { 'application/octet-stream' })
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch { $ctx.Response.StatusCode = 500 }
  finally { $ctx.Response.OutputStream.Close() }
}
