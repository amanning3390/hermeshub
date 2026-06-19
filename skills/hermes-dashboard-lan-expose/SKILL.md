---
name: hermes-dashboard-lan-expose
description: Expose the Hermes Agent dashboard (bound to 127.0.0.1:9119) to LAN devices without --insecure. Uses nginx + iptables on Linux, netsh portproxy on Windows.
version: "1.0.0"
license: MIT
compatibility: Linux (Fedora/RHEL) or Windows 8.1+ — Hermes dashboard must be installed on port 9119
metadata:
  author: hermeshub
  hermes:
    tags: [hermes, dashboard, networking, nginx, lan, proxy, windows, linux, devops]
    category: devops
    requires_toolsets: [terminal, file, web]
---

# Hermes Dashboard — LAN Expose

Expose the Hermes Agent dashboard (127.0.0.1:9119) to other devices on the
local network without using `--insecure` or modifying the dashboard's bind
address.

## When to Use

- You want to open the Hermes web dashboard from your phone / tablet / LAN device
- You see "Invalid Host header" when accessing the dashboard from a LAN browser
- You want to set up dashboard auto-start so it survives reboots
- The user asks: "How do I access the Hermes dashboard from another device?"

## Prerequisites

- **Hermes Agent** installed with dashboard (serving on 127.0.0.1:9119)
- **Linux**: Fedora/RHEL with `sudo` access (uses dnf, firewalld, SELinux)
- **Windows**: PowerShell 5.1+ running as Administrator

## Architecture

The dashboard stays on 127.0.0.1. A local proxy layer forwards LAN traffic:

| Layer | Linux | Windows |
|---|---|---|
| Port forwarding | iptables DNAT → nginx (9191→9119) | `netsh interface portproxy` |
| Host header | nginx rewrites → 127.0.0.1 | Patch accepts LAN IPs directly |
| Firewall | firewalld | `netsh advfirewall` |
| Auto-start at boot | systemd user service | Scheduled Task (schtasks) |
| Extra software | nginx | None (built-in) |

A Hermes `web_server.py` patch (included) adds RFC1918 private IP ranges
to the CORS and Host validation — required on both platforms.

## Procedure (Linux)

### 1. Clone the deploy package

```bash
git clone https://github.com/totaldecay78/hermes-dashboard-lan-expose.git /tmp/hermes-lan
cd /tmp/hermes-lan
```

### 2. Deploy infrastructure

```bash
sudo ./deploy.sh
# Or with a custom port:
sudo ./deploy.sh --port 9090 --internal-port 9191
```

This installs nginx, configures SELinux & firewalld, sets up iptables DNAT
rules, and creates a systemd service to persist them across reboots.

### 3. Patch Hermes web_server.py

```bash
cd ~/.hermes/hermes-agent
git apply /tmp/hermes-lan/linux/patches/allow-lan-origins.patch
```

### 4. Restart the dashboard

```bash
hermes dashboard --stop
hermes dashboard --no-open &
```

### 5. (Optional) Auto-start at boot

```bash
/tmp/hermes-lan/deploy-dashboard-user-service.sh
```

### 6. Verify

```bash
/tmp/hermes-lan/verify.sh
# From a LAN device:
curl -s http://192.168.1.YOUR_IP:9119/api/status
```

## Procedure (Windows)

### 1. Clone the deploy package

```powershell
git clone https://github.com/totaldecay78/hermes-dashboard-lan-expose.git C:\hermes-lan
cd C:\hermes-lan
```

### 2. Deploy infrastructure

```powershell
# Run PowerShell as Administrator
.\deploy.ps1
# Or with a custom port:
.\deploy.ps1 -LanPort 9090
```

This creates a `netsh interface portproxy` rule and a Windows Firewall
inbound rule — no extra software needed.

### 3. Patch Hermes web_server.py

```powershell
cd $env:USERPROFILE\.hermes\hermes-agent
git apply (Join-Path "C:\hermes-lan" "windows\patches\allow-lan-origins.patch")
```

### 4. Restart the dashboard

```powershell
hermes dashboard --stop
hermes dashboard --no-open
```

### 5. (Optional) Auto-start at boot

```powershell
.\deploy-dashboard-startup.ps1
```

### 6. Verify

```powershell
.\verify.ps1
```

## Rollback

```bash
# Linux:
sudo /tmp/hermes-lan/rollback.sh
cd ~/.hermes/hermes-agent && git checkout -- hermes_cli/web_server.py
```

```powershell
# Windows (Admin):
.\rollback.ps1
cd $env:USERPROFILE\.hermes\hermes-agent
git checkout -- hermes_cli\web_server.py
```

## Pitfalls

- **SELinux blocks nginx (Linux)**: Run `semanage port -a -t http_port_t -p tcp 9191`
  and `setsebool -P httpd_can_network_connect 1` (handled by deploy.sh)
- **route_localnet=0 (Linux)**: iptables DNAT drops packets to 127.0.0.0/8 from
  external interfaces — the deploy script sets `net.ipv4.conf.all.route_localnet=1`
- **Not running as Administrator (Windows)**: Portproxy + firewall rules require
  elevation — right-click PowerShell → Run as Administrator
- **Dashboard must be restarted after patch**: The old process still runs the
  unpatched code — kill it with `hermes dashboard --stop` then restart
- **CORS + Origin double check**: Hermes validates origins at TWO levels:
  CORS middleware AND `_is_accepted_host`. The patch covers both

## Verification

- Linux: `curl -s http://127.0.0.1:9119/api/status` returns JSON with version info
- Windows: Same command in PowerShell, or use `.\verify.ps1`
- From LAN: `curl -s http://<YOUR_LAN_IP>:9119/api/status` returns the same
- Dashboard auto-starts on reboot: Reboot and verify the dashboard comes up

## Files

The full deployable package lives at:
**https://github.com/totaldecay78/hermes-dashboard-lan-expose**

```
/
├── linux/             ← Fedora/RHEL: nginx + iptables + firewalld
│   ├── deploy.sh
│   ├── verify.sh
│   ├── rollback.sh
│   ├── deploy-dashboard-user-service.sh
│   ├── config/
│   └── patches/
├── windows/           ← Windows 8.1+: netsh + advfirewall + schtasks
│   ├── deploy.ps1
│   ├── verify.ps1
│   ├── rollback.ps1
│   ├── deploy-dashboard-startup.ps1
│   └── patches/
├── deploy.sh          ← OS auto-detection (Linux)
└── deploy.ps1         ← OS auto-detection (Windows)
```
