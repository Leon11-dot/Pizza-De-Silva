
param(
  [string]$SupabaseUrl = "https://rsxviwsmymlrwgphydae.supabase.co",
  [string]$SupabaseKey = "REPLACE_WITH_ADMIN_SERVICE_KEY",
  [string]$PrinterName = "Brother HL-L2350DW",
  [int]$PollSeconds = 5
)

$ErrorActionPreference = "Stop"

function Invoke-Supa {
  param(
    [string]$Path,
    [string]$Method = "GET",
    $Body = $null,
    [hashtable]$ExtraHeaders = @{}
  )

  $headers = @{
    "apikey" = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type" = "application/json"
  }

  foreach ($k in $ExtraHeaders.Keys) { $headers[$k] = $ExtraHeaders[$k] }

  $params = @{
    Uri = "$SupabaseUrl/rest/v1/$Path"
    Method = $Method
    Headers = $headers
  }

  if ($Body -ne $null) {
    $params["Body"] = ($Body | ConvertTo-Json -Depth 20)
  }

  return Invoke-RestMethod @params
}

function Escape-Html([string]$s) {
  if ($null -eq $s) { return "" }
  return [System.Net.WebUtility]::HtmlEncode($s)
}

function Build-OrderHtml($order) {
  $items = ""
  foreach ($item in $order.items) {
    $line = "<tr><td>$($item.qty)x</td><td><b>$(Escape-Html $item.name)</b><br><span>$(Escape-Html $item.variant)</span>"
    if ($item.extraName) { $line += "<br><span>Extra: $(Escape-Html $item.extraName)</span>" }
    if ($item.note) { $line += "<br><span>Hinweis: $(Escape-Html $item.note)</span>" }
    $line += "</td><td style='text-align:right;'>$([string]::Format('{0:N2} €',[double]$item.price))</td></tr>"
    $items += $line
  }

  $customer = $order.customer
  $eta = if ($order.eta) { "$($order.eta) Minuten" } else { "-" }
  $created = [DateTime]::Parse($order.created_at).ToLocalTime().ToString("dd.MM.yyyy HH:mm")
  $total = [string]::Format("{0:N2} €",[double]$order.total)

  return @"
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
@page { size: A4; margin: 14mm; }
body { font-family: Arial, sans-serif; color:#111; }
h1 { font-size: 28px; margin:0 0 8px; }
h2 { font-size: 20px; margin:18px 0 8px; }
.big { font-size: 22px; font-weight:700; }
.box { border:2px solid #111; padding:12px; margin:10px 0; }
table { width:100%; border-collapse:collapse; }
td { padding:9px 4px; vertical-align:top; border-bottom:1px solid #ccc; }
.small { color:#444; font-size:13px; }
.total { font-size:24px; font-weight:700; text-align:right; margin-top:14px; }
</style>
</head>
<body>
<h1>PIZZA DE SILVA</h1>
<div class="big">BESTELLUNG #$($order.order_number)</div>
<div class="small">$created</div>

<div class="box">
  <div class="big">$((Escape-Html $customer.type).ToUpper())</div>
  <p><b>Name:</b> $(Escape-Html $customer.name)<br>
  <b>Telefon:</b> $(Escape-Html $customer.phone)<br>
  <b>Adresse:</b> $(Escape-Html $customer.address)<br>
  <b>Zahlung:</b> $(Escape-Html $customer.payment)<br>
  <b>Zeit:</b> $eta</p>
</div>

<h2>Bestellung</h2>
<table>$items</table>

$(if ($customer.note) { "<div class='box'><b>Kundenhinweis:</b><br>$(Escape-Html $customer.note)</div>" } else { "" })

<div class="total">Gesamt: $total</div>
</body>
</html>
"@
}

function Print-HtmlFile([string]$HtmlPath) {
  $edge = (Get-Command msedge.exe -ErrorAction SilentlyContinue)
  if (-not $edge) {
    $edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    if (-not (Test-Path $edgePath)) {
      $edgePath = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
    }
  } else {
    $edgePath = $edge.Source
  }

  if (-not (Test-Path $edgePath)) {
    throw "Microsoft Edge wurde nicht gefunden."
  }

  $pdfPath = [System.IO.Path]::ChangeExtension($HtmlPath, ".pdf")
  $uri = (New-Object System.Uri($HtmlPath)).AbsoluteUri

  & $edgePath --headless --disable-gpu --print-to-pdf="$pdfPath" "$uri" | Out-Null

  if (-not (Test-Path $pdfPath)) {
    throw "PDF konnte nicht erzeugt werden."
  }

  $sumatra = Get-Command SumatraPDF.exe -ErrorAction SilentlyContinue
  if ($sumatra) {
    & $sumatra.Source -print-to "$PrinterName" -silent "$pdfPath" | Out-Null
    return
  }

  Start-Process -FilePath $pdfPath -Verb PrintTo -ArgumentList "`"$PrinterName`"" -WindowStyle Hidden
}

Write-Host "Pizza De Silva Autodruck gestartet."
Write-Host "Drucker: $PrinterName"
Write-Host "Prüfung alle $PollSeconds Sekunden."

while ($true) {
  try {
    $path = "orders?status=eq.accepted&print_status=eq.pending&select=*&order=created_at.asc&limit=10"
    $orders = Invoke-Supa -Path $path

    foreach ($order in $orders) {
      try {
        Invoke-Supa -Path "orders?id=eq.$($order.id)" -Method "PATCH" -Body @{ print_status="printing" } -ExtraHeaders @{"Prefer"="return=minimal"} | Out-Null

        $tmp = Join-Path $env:TEMP ("pizza-de-silva-" + $order.order_number + ".html")
        Build-OrderHtml $order | Set-Content -Path $tmp -Encoding UTF8

        Print-HtmlFile $tmp

        Invoke-Supa -Path "orders?id=eq.$($order.id)" -Method "PATCH" -Body @{
          print_status="printed"
          printed_at=(Get-Date).ToUniversalTime().ToString("o")
        } -ExtraHeaders @{"Prefer"="return=minimal"} | Out-Null

        Write-Host "Gedruckt: Bestellung #$($order.order_number)"
      }
      catch {
        Write-Warning "Druckfehler bei Bestellung #$($order.order_number): $($_.Exception.Message)"
        try {
          Invoke-Supa -Path "orders?id=eq.$($order.id)" -Method "PATCH" -Body @{ print_status="error" } -ExtraHeaders @{"Prefer"="return=minimal"} | Out-Null
        } catch {}
      }
    }
  }
  catch {
    Write-Warning "Verbindungsfehler: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $PollSeconds
}
