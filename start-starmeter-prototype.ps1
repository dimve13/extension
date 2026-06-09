param(
    [int]$Port = 7171,
    [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = "http://${HostName}:${Port}/"
$ipAddress = [System.Net.IPAddress]::Parse($HostName)
$listener = [System.Net.Sockets.TcpListener]::new($ipAddress, $Port)
Add-Type -AssemblyName System.Drawing

function Convert-ToJsonResponse($value) {
    return ($value | ConvertTo-Json -Depth 20 -Compress)
}

function Get-Slots {
    $path = Join-Path $root "data\slots.json"
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
}

function Get-Slot($slotId) {
    $slots = Get-Slots
    $slot = $slots.PSObject.Properties[$slotId].Value
    if ($null -eq $slot) {
        return @{
            rank = [int]$slotId
            name = "STARmeter Slot $slotId"
            profileColor = "#334155"
            movies = @()
        }
    }
    return $slot
}

function Get-RequestHost([string]$request, [string]$fallback) {
    foreach ($line in ($request -split "`r?`n")) {
        if ($line -match "^Host:\s*(.+)$") {
            return $Matches[1].Trim()
        }
    }
    return $fallback
}

function New-HttpResponse([int]$status, [string]$contentType, [string]$body) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    return New-BinaryHttpResponse $status $contentType $bytes
}

function New-BinaryHttpResponse([int]$status, [string]$contentType, [byte[]]$bytes) {
    $reason = if ($status -eq 200) { "OK" } elseif ($status -eq 404) { "Not Found" } else { "Internal Server Error" }
    $header = "HTTP/1.1 $status $reason`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache, no-store, max-age=0`r`nConnection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $response = [byte[]]::new($headerBytes.Length + $bytes.Length)
    [System.Buffer]::BlockCopy($headerBytes, 0, $response, 0, $headerBytes.Length)
    [System.Buffer]::BlockCopy($bytes, 0, $response, $headerBytes.Length, $bytes.Length)
    return $response
}

function New-Manifest {
    $catalogs = @()
    foreach ($i in 1..100) {
        $slotId = "{0:D3}" -f $i
        $catalogs += @{
            type = "movie"
            id = "starmeter.slot.$slotId"
            name = "STARmeter Slot $slotId"
        }
    }

    return @{
        id = "community.starmeter.prototype"
        version = "1.0.0"
        name = "STARmeter 100 Prototype"
        description = "Prototype dynamic STARmeter actor filmography slots for Nuvio testing."
        resources = @("catalog", "meta")
        types = @("movie")
        idPrefixes = @("tt")
        catalogs = $catalogs
    }
}

function New-NuvioCollection($baseUrl) {
    $folders = @()
    foreach ($i in 1..100) {
            $slotId = "{0:D3}" -f $i
            $folders += @{
                title = "Slot $slotId"
                hideTitle = $true
            coverImageUrl = "$baseUrl/starmeter/slot/$slotId/cover.jpg"
            focusGifUrl = "$baseUrl/starmeter/slot/$slotId/cover.jpg"
            catalogSources = @(
                @{
                    type = "movie"
                    addonId = "community.starmeter.prototype"
                    catalogId = "starmeter.slot.$slotId"
                }
            )
        }
    }

    return @{
        name = "STARmeter 100 Prototype"
        version = 1
        folders = $folders
    }
}

function New-Catalog($slotId) {
    $slot = Get-Slot $slotId
    $metas = @()
    foreach ($movie in @($slot.movies)) {
        $metas += @{
            id = $movie.id
            type = "movie"
            name = $movie.name
            poster = $movie.poster
            background = $movie.background
            description = $movie.description
        }
    }
    return @{ metas = $metas }
}

function New-Meta($imdbId) {
    $slots = Get-Slots
    foreach ($property in $slots.PSObject.Properties) {
        foreach ($movie in @($property.Value.movies)) {
            if ($movie.id -eq $imdbId) {
                return @{
                    meta = @{
                        id = $movie.id
                        type = "movie"
                        name = $movie.name
                        poster = $movie.poster
                        background = $movie.background
                        description = $movie.description
                    }
                }
            }
        }
    }
    return @{ meta = $null }
}

function New-CoverSvg($slotId) {
    $slot = Get-Slot $slotId
    $name = [System.Security.SecurityElement]::Escape([string]$slot.name)
    $rank = [System.Security.SecurityElement]::Escape([string]$slot.rank)
    $color = [string]$slot.profileColor
    if ([string]::IsNullOrWhiteSpace($color)) { $color = "#334155" }

    return @"
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <rect width="600" height="900" fill="#101418"/>
  <rect x="0" y="0" width="600" height="900" fill="$color"/>
  <circle cx="300" cy="310" r="165" fill="rgba(255,255,255,0.18)"/>
  <circle cx="300" cy="270" r="85" fill="rgba(255,255,255,0.55)"/>
  <path d="M125 660c25-105 110-170 175-170s150 65 175 170" fill="rgba(255,255,255,0.55)"/>
  <rect x="34" y="34" width="140" height="72" rx="12" fill="rgba(0,0,0,0.36)"/>
  <text x="104" y="83" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="#ffffff">#$rank</text>
  <text x="300" y="735" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800" fill="#ffffff">$name</text>
  <text x="300" y="790" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="500" fill="rgba(255,255,255,0.82)">STARmeter Prototype</text>
</svg>
"@
}

function New-CoverJpeg($slotId) {
    $slot = Get-Slot $slotId
    $name = [string]$slot.name
    $rank = [string]$slot.rank
    $color = [string]$slot.profileColor
    if ([string]::IsNullOrWhiteSpace($color)) { $color = "#334155" }

    $bitmap = [System.Drawing.Bitmap]::new(600, 900)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $background = [System.Drawing.ColorTranslator]::FromHtml($color)
    $graphics.Clear($background)

    $white = [System.Drawing.Brushes]::White
    $shadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(80, 0, 0, 0))
    $soft = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(95, 255, 255, 255))
    $dark = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
    $formatCenter = [System.Drawing.StringFormat]::new()
    $formatCenter.Alignment = [System.Drawing.StringAlignment]::Center
    $formatCenter.LineAlignment = [System.Drawing.StringAlignment]::Center

    $graphics.FillEllipse($soft, 135, 145, 330, 330)
    $graphics.FillEllipse([System.Drawing.Brushes]::White, 215, 185, 170, 170)
    $graphics.FillPie([System.Drawing.Brushes]::White, 95, 470, 410, 300, 180, 180)
    $graphics.FillRectangle($shadow, 0, 650, 600, 250)
    $graphics.FillRectangle($dark, 32, 32, 145, 76)

    $rankFont = [System.Drawing.Font]::new("Arial", 34, [System.Drawing.FontStyle]::Bold)
    $nameFont = [System.Drawing.Font]::new("Arial", 42, [System.Drawing.FontStyle]::Bold)
    $labelFont = [System.Drawing.Font]::new("Arial", 22, [System.Drawing.FontStyle]::Regular)

    $graphics.DrawString("#$rank", $rankFont, $white, [System.Drawing.RectangleF]::new(32, 32, 145, 76), $formatCenter)
    $graphics.DrawString($name, $nameFont, $white, [System.Drawing.RectangleF]::new(34, 700, 532, 95), $formatCenter)
    $graphics.DrawString("STARmeter Prototype", $labelFont, $white, [System.Drawing.RectangleF]::new(34, 790, 532, 50), $formatCenter)

    $stream = [System.IO.MemoryStream]::new()
    $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $bytes = $stream.ToArray()

    $rankFont.Dispose()
    $nameFont.Dispose()
    $labelFont.Dispose()
    $shadow.Dispose()
    $soft.Dispose()
    $dark.Dispose()
    $formatCenter.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
    $stream.Dispose()

    return $bytes
}

$listener.Start()
Write-Host "STARmeter prototype server running at $prefix"
Write-Host "Manifest: ${prefix}manifest.json"
Write-Host "Nuvio collection: ${prefix}nuvio-collection.json"
Write-Host "Press Ctrl+C to stop."

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $buffer = [byte[]]::new(8192)
        $read = $stream.Read($buffer, 0, $buffer.Length)
        $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
        $requestLine = ($request -split "`r?`n")[0]
        $parts = $requestLine -split " "
        $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
        $path = ([System.Uri]::UnescapeDataString(($rawPath -split "\?")[0])).Trim("/")
        $requestHost = Get-RequestHost $request "${HostName}:${Port}"
        $baseUrl = "http://$requestHost"

        try {
            if ($path -eq "" -or $path -eq "health") {
                $response = New-HttpResponse 200 "text/plain; charset=utf-8" "ok"
                $stream.Write($response, 0, $response.Length)
                $stream.Close()
                $client.Close()
                continue
            }

            if ($path -eq "manifest.json") {
                $response = New-HttpResponse 200 "application/json; charset=utf-8" (Convert-ToJsonResponse (New-Manifest))
                $stream.Write($response, 0, $response.Length)
                $stream.Close()
                $client.Close()
                continue
            }

            if ($path -eq "nuvio-collection.json") {
                $response = New-HttpResponse 200 "application/json; charset=utf-8" (Convert-ToJsonResponse (New-NuvioCollection $baseUrl))
                $stream.Write($response, 0, $response.Length)
                $stream.Close()
                $client.Close()
                continue
            }

            if ($path -match "^catalog/movie/starmeter\.slot\.(\d{3})\.json$") {
                $response = New-HttpResponse 200 "application/json; charset=utf-8" (Convert-ToJsonResponse (New-Catalog $Matches[1]))
                $stream.Write($response, 0, $response.Length)
                $stream.Close()
                $client.Close()
                continue
            }

            if ($path -match "^meta/movie/(tt\d+)\.json$") {
                $response = New-HttpResponse 200 "application/json; charset=utf-8" (Convert-ToJsonResponse (New-Meta $Matches[1]))
                $stream.Write($response, 0, $response.Length)
                $stream.Close()
                $client.Close()
                continue
            }

            if ($path -match "^starmeter/slot/(\d{3})/cover\.svg$") {
                $response = New-HttpResponse 200 "image/svg+xml; charset=utf-8" (New-CoverSvg $Matches[1])
                $stream.Write($response, 0, $response.Length)
                $stream.Close()
                $client.Close()
                continue
            }

            if ($path -match "^starmeter/slot/(\d{3})/cover\.jpg$") {
                $response = New-BinaryHttpResponse 200 "image/jpeg" (New-CoverJpeg $Matches[1])
                $stream.Write($response, 0, $response.Length)
                $stream.Close()
                $client.Close()
                continue
            }

            $response = New-HttpResponse 404 "application/json; charset=utf-8" '{"error":"not found"}'
            $stream.Write($response, 0, $response.Length)
        } catch {
            $response = New-HttpResponse 500 "application/json; charset=utf-8" (Convert-ToJsonResponse @{ error = $_.Exception.Message })
            $stream.Write($response, 0, $response.Length)
        } finally {
            $stream.Close()
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
