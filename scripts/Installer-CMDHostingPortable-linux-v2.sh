#!/usr/bin/env bash
# CMD Hosting portable host auto-synchronization — Linux VM / Ryzen / EPYC / Supermicro.
# One-time owner enrollment, then separate user systemd service and 10-minute heartbeat.
# This does NOT execute commands from the cloud, install games, edit game saves or touch V5.
set -euo pipefail
[[ "$(uname -s)" == "Linux" ]] || { echo "Linux host required"; exit 2; }
command -v node >/dev/null && command -v curl >/dev/null || { echo "Node >=20 and curl required"; exit 2; }
(( $(node -p 'parseInt(process.versions.node.split(".")[0])') >= 20 )) || { echo "Node >=20 required"; exit 2; }
BASE="https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/272121bdebfaa4f0aaaca6d5f2a2be31e04979c8/provisioning"
DIR="${XDG_DATA_HOME:-$HOME/.local/share}/cmdhosting/portable-v2"
STATE="${CMD_HOST_STATE_DIR:-$HOME/.cmdhosting}"
CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/cmdhosting"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT="$UNIT_DIR/cmdhosting-portable-v2.service"
SECRET="$CONFIG/portable-v2.env"
if [[ -e "$UNIT" ]]; then echo "Agent portable already configured, preserving it without duplication."; exit 0; fi
mkdir -p "$DIR" "$STATE" "$CONFIG" "$UNIT_DIR"
chmod 700 "$STATE" "$CONFIG"
for file in host-capability.mjs machine-detection.mjs portable-host-agent.mjs; do
  curl -fsSL --connect-timeout 10 --max-time 45 "$BASE/$file" -o "$DIR/$file.download"
  mv "$DIR/$file.download" "$DIR/$file"
  node --check "$DIR/$file"
done
node "$DIR/portable-host-agent.mjs" --diagnose
if [[ ! -s "$STATE/host-id.json" ]]; then
  ID="$(node -p "'host-'+require('crypto').randomUUID()")"
  (umask 077; printf '{"schema":"cmd-hosting/host-id-v1","id":"%s"}\n' "$ID" > "$STATE/host-id.json")
fi
ID="$(node -e "const f=require('fs');const p=process.argv[1];const v=JSON.parse(f.readFileSync(p));if(!/^host-[0-9a-f-]{36}$/.test(v.id))process.exit(2);process.stdout.write(v.id)" "$STATE/host-id.json")"
if [[ ! -e "$SECRET" ]]; then
  read -r -s -p "CMD Hosting one-time machine enrollment code: " CODE
  printf '\n'
  [[ "$CODE" =~ ^[a-zA-Z0-9_-]{32,128}$ ]] || { echo "Invalid enrollment code"; exit 2; }
  RESPONSE="$(printf '{"agentId":"%s","code":"%s"}' "$ID" "$CODE" | curl -fsS -X POST -H 'content-type: application/json' --data-binary @- 'https://cmd-hosting-cloud-agents-production.up.railway.app/v1/agents/enroll/claim')"
  unset CODE
  TOKEN="$(printf '%s' "$RESPONSE" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);if(!j.ok||!j.machineToken)process.exit(2);process.stdout.write(j.machineToken)})")"
  (umask 077; printf 'CMD_CLOUD_AGENT_TOKEN=%s\n' "$TOKEN" > "$SECRET")
  unset TOKEN RESPONSE
fi
chmod 600 "$SECRET"
if ! command -v systemctl >/dev/null || ! systemctl --user list-units >/dev/null 2>&1; then
 echo "Files enrolled. User systemd unavailable; no service was activated."
 exit 2
fi
NODE="$(command -v node)"
cat > "$UNIT" <<EOF
[Unit]
Description=CMD Hosting portable host monitoring (no game installation)
After=network-online.target
[Service]
Type=simple
WorkingDirectory=$DIR
EnvironmentFile=$SECRET
Environment=CMD_HOST_STATE_DIR=$STATE
ExecStart=$NODE $DIR/portable-host-agent.mjs --loop
Restart=on-failure
RestartSec=60
[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now cmdhosting-portable-v2.service
echo "CMD Hosting portable monitoring enabled for machine $ID."
echo "MicroCloud: group independent nodes later using CMD_CHASSIS_ID; no resources pooled."
echo "To keep the service running after logout, the host operator must configure systemd user lingering."
