# PowerShell script to run both frontend and backend

$rootDir = $PSScriptRoot
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

# Function to kill process by port
function Kill-ProcessByPort {
    param([int]$Port)
    try {
        $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop | Where-Object { $_.State -eq 'Listen' -and $_.OwningProcess -ne 0 } | Select-Object -First 1
        if ($process) {
            Write-Host "Killing process $($process.OwningProcess) on port $Port"
            Stop-Process -Id $process.OwningProcess -Force -ErrorAction Stop
            return $true
        }
        return $false
    }
    catch {
        Write-Warning "Failed to kill process on port $Port : $($_.Exception.Message)"
        return $false
    }
}

# Function to check if a port is listening
function Test-PortListening {
    param([int]$Port)
    try {
        # Try to connect to the port directly (most reliable for detecting active servers)
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        try {
            $tcpClient.Connect("127.0.0.1", $Port)
            $tcpClient.Close()
            return $true
        } catch {
            # Try IPv6 localhost
            try {
                $tcpClient.Connect("::1", $Port)
                $tcpClient.Close()
                return $true
            } catch {
                # Connection failed, check if there are any listening connections as fallback
                $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop | Where-Object State -eq Listen
                return $connections.Count -gt 0
            }
        }
    }
    catch {
        return $false
    }
}

# Function to wait for server to start
function Wait-ForServer {
    param([int]$Port, [string]$ServerName, [int]$TimeoutSeconds = 30)
    Write-Host "Waiting for $ServerName on port $Port..."
    $timeout = New-TimeSpan -Seconds $TimeoutSeconds
    $start = Get-Date
    do {
        if (Test-PortListening $Port) {
            # For HTTP servers, also test if they respond to HTTP requests
            if ($ServerName -eq "Frontend") {
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:$Port/" -TimeoutSec 3 -ErrorAction Stop
                    Write-Host "$ServerName ready on port $Port"
                    return $true
                } catch {
                    # For static file servers, just check if port is listening after a short delay
                    Start-Sleep -Seconds 3
                    if (Test-PortListening $Port) {
                        Write-Host "$ServerName ready on port $Port (static file server detected)"
                        return $true
                    }
                }
            } elseif ($ServerName -eq "Backend") {
                # For API servers, just check if the port is listening since they may not respond to "/"
                Write-Host "$ServerName ready on port $Port"
                return $true
            } else {
            Write-Host "$ServerName ready on port $Port"
            return $true
            }
        }
        Start-Sleep -Seconds 1
    } while ((Get-Date) - $start -lt $timeout)
    Write-Error "$ServerName failed to start within $TimeoutSeconds seconds"
    return $false
}

# Validate directories and dependencies
@($backendDir, $frontendDir) | ForEach-Object {
    if (!(Test-Path $_)) {
        Write-Error "Directory not found: $_"
        exit 1
    }
}

# Check dependencies
@("dotnet") | ForEach-Object {
    try {
        $version = & $_ --version 2>&1
        Write-Host "Found $_`: $version"
    }
    catch {
        Write-Error "$_ is not installed or not in PATH. Please install $_."
        exit 1
    }
}

# Check for Python (optional, with fallback)
$pythonAvailable = $false
try {
    $pythonVersion = & python --version 2>&1
    Write-Host "Found python: $pythonVersion"
    $pythonAvailable = $true
}
catch {
    Write-Warning "Python not found. Will use dotnet serve as fallback."
}

# Cleanup and start servers
Write-Host "Cleaning up ports..."
5267, 8000 | ForEach-Object { $null = Kill-ProcessByPort $_ }

# Configure servers based on availability
$servers = @(
    @{Name = "Backend"; Port = 5267; Dir = $backendDir; Cmd = "dotnet"; Args = "run"; Timeout = 60; Url = "http://localhost:5267"}
)

# Try to start frontend server with fallback logic
$frontendStarted = $false
if ($pythonAvailable) {
    Write-Host "Trying Python HTTP server on port 8000..."
    try {
        $pythonProcess = Start-Process "python" -ArgumentList "-m http.server 8000" -WorkingDirectory $frontendDir -NoNewWindow -PassThru -ErrorAction Stop
        if (Wait-ForServer 8000 "Frontend" 10) {
            $servers += @{Name = "Frontend"; Port = 8000; Dir = $frontendDir; Cmd = "python"; Args = "-m http.server 8000"; Timeout = 15; Url = "http://localhost:8000"; Process = $pythonProcess}
            $frontendStarted = $true
            Write-Host "Frontend (Python) running at: http://localhost:8000"
        } else {
            Write-Host "Python server failed to start properly, trying dotnet-serve fallback..."
            $pythonProcess.Kill()
        }
    } catch {
        Write-Host "Python server failed to start, trying dotnet-serve fallback..."
    }
}

# If Python failed or isn't available, try dotnet-serve
if (-not $frontendStarted) {
    try {
        # Check if dotnet-serve is installed
        $dotnetServeInstalled = $null
        try {
            $dotnetServeInstalled = & dotnet tool list --global 2>$null | Select-String "dotnet-serve"
        } catch {}

        if (-not $dotnetServeInstalled) {
            Write-Host "Installing dotnet-serve globally..."
            & dotnet tool install --global dotnet-serve 2>$null | Out-Null
        }

        Write-Host "Starting dotnet-serve on port 8000..."
        $dotnetProcess = Start-Process "dotnet" -ArgumentList "serve -p 8000" -WorkingDirectory $frontendDir -NoNewWindow -PassThru -ErrorAction Stop

        if (Wait-ForServer 8000 "Frontend" 15) {
            $servers += @{Name = "Frontend"; Port = 8000; Dir = $frontendDir; Cmd = "dotnet"; Args = "serve -p 8000"; Timeout = 15; Url = "http://localhost:8000"; Process = $dotnetProcess}
            $frontendStarted = $true
            Write-Host "Frontend (dotnet-serve) running at: http://localhost:8000"
        } else {
            Write-Host "dotnet-serve failed to start properly"
            $dotnetProcess.Kill()
        }
    } catch {
        Write-Host "Both Python and dotnet-serve failed to start frontend server"
        Write-Host "Please install Python or dotnet-serve manually and run:"
        Write-Host "  python -m http.server 8000  (in the frontend directory)"
        Write-Host "  OR"
        Write-Host "  dotnet tool install --global dotnet-serve"
        Write-Host "  dotnet serve -p 8000  (in the frontend directory)"
        exit 1
    }
}

$processes = @{}
$failed = $false

foreach ($server in $servers) {
    Write-Host "Starting $($server.Name)..."
    try {
        # Use existing process if it was already started (for frontend fallback)
        if ($server.Process) {
            $process = $server.Process
        } else {
        $process = Start-Process $server.Cmd -ArgumentList $server.Args -WorkingDirectory $server.Dir -NoNewWindow -PassThru -ErrorAction Stop
        }
        $processes[$server.Name] = $process

        if (Wait-ForServer $server.Port $server.Name $server.Timeout) {
            Write-Host "$($server.Name) running at: $($server.Url)"
        } else {
            throw "Failed to start"
        }
    }
    catch {
        Write-Error "Failed to start $($server.Name): $($_.Exception.Message)"
        $failed = $true
        break
    }
}

# Handle startup failures
if ($failed) {
    Write-Host "Some servers failed to start. Stopping any that did start..."
    foreach ($process in $processes.Values) {
        if ($process -and !$process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }
    5267, 3000 | ForEach-Object { $null = Kill-ProcessByPort $_ }
    Write-Host "Failed servers have been stopped."
    exit 1
}

# Success message and wait for 'q' key to quit
Write-Host "Both servers running successfully!"
Write-Host "Press 'q' to stop servers..."
try {
    do {
        $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } while ($key.Character -ne 'q' -and $key.Character -ne 'Q')
    Write-Host "Stopping servers..."
}
catch {
    Write-Host "Key press interrupted, stopping servers..."
}

# Stop all processes
Write-Host "Stopping servers..."
$stopped = @{}
foreach ($server in $servers) {
    $process = $processes[$server.Name]
    if ($process -and !$process.HasExited) {
        try {
            Stop-Process -Id $process.Id -Force -ErrorAction Stop
            $stopped[$server.Name] = $true
        }
        catch {
            Write-Warning "Failed to stop $($server.Name): $($_.Exception.Message)"
            $stopped[$server.Name] = $false
        }
    } else {
        $stopped[$server.Name] = $false
    }
}

# Final cleanup - cleanup all ports that were used
5267, 8000 | ForEach-Object { $null = Kill-ProcessByPort $_ }

# Report results
foreach ($server in $servers) {
    $status = if ($stopped[$server.Name]) { 'Yes' } else { 'No (may have already exited)' }
    Write-Host "$($server.Name) stopped: $status"
}

Write-Host "All servers stopped."
