#!/usr/bin/env bash
# CMD Hosting optional portable host monitor for Linux x64/ARM64.
# No game installation, no overwrite of existing agents, no payment or SSH changes.
set -euo pipefail
if [[ "$(uname -s)" != Linux ]]; then echo "Linux only"; exit 2; fi
if ! command -v node >/dev/null; then echo "Node.js 20+ required"; exit 2; fi
MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if (( MAJOR < 20 )); then echo "Node.js 20+ required"; exit 2; fi
if ! command -v curl >/dev/null; then echo "curl required"; exit 2; fi
BASE="https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/28803c745190cecd6b54365a360a01af81266ed8/provisioning"
BASE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/cmdhosting/portable"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/cmdhosting"
SERVICE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
SERVICE_FILE="$SERVICE_DIR/cmdhosting-portable.service"
mkdir -p "$BASE_DIR" "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"
if [[ -e "$SERVICE_FILE" ]]; then echo "Existing portable service preserved. No duplicate."; exit 0; fi
curl -fsSL --connect-timeout 10 --max-time 40 "$BASE/host-capability.mjs" -o "$BASE_DIR/host-capability.mjs.tmp"
curl -fsSL --connect-timeout 10 --max-time 40 "$BASE/portable-host-agent.mjs" -o "$BASE_DIR/portable-host-agent.mjs.tmp"
node --check "$BASE_DIR/host-capability.mjs.tmp"
node --check "$BASE_DIR/portable-host-agent.mjs.tmp"
mv "$BASE_DIR/host-capability.mjs.tmp" "$BASE_DIR/host-capability.mjs"
mv "$BASE_DIR/portable-host-agent.mjs.tmp" "$BASE_DIR/portable-host-agent.mjs"
node "$BASE_DIR/portable-host-agent.mjs" --diagnose
SECRET="$CONFIG_DIR/portable.env"
if [[ ! -e "$SECRET" ]]; then
  if [[ -z "${CMD_CLOUD_AGENT_TOKEN:-}" ]]; then
    read -r -s -p "CMD Hosting Cloud Agent token (input hidden): " CMD_CLOUD_AGENT_TOKEN
    printf '\n'
  fi
  if [[ ! "${CMD_CLOUD_AGENT_TOKEN:-}" =~ ^[A-Za-z0-9._-]{12,256}$ ]]; then echo "Invalid/missing pairing token; no service created"; exit 2; fi
  ( umask 077; printf 'CMD_CLOUD_AGENT_TOKEN=%s\n' "$CMD_CLOUD_AGENT_TOKEN" > "$SECRET"; )
  unset CMD_CLOUD_AGENT_TOKEN
fi
chmod 600 "$SECRET"
if ! command -v systemctl >/dev/null || ! systemctl --user list-units >/dev/null 2>&1; then
 echo "Files prepared, but user systemd unavailable. No background task enabled."
 exit 2
fi
NODE_PATH="$(command -v node)"
mkdir -p "$SERVICE_DIR"
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=CMD Hosting portable read-only cloud monitoring
After=network-online.target
[Service]
Type=simple
WorkingDirectory=$BASE_DIR
EnvironmentFile=$SECRET
ExecStart=$NODE_PATH $BASE_DIR/portable-host-agent.mjs --loop
Restart=on-failure
RestartSec=60
[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now cmdhosting-portable.service
echo "Portable monitoring enabled on Linux. Existing game agents unchanged."
echo "Continuous operation after logout depends on this host's systemd user linger policy."
