#!/usr/bin/env bash
# Start Readhouse through mise, reachable from a phone on the LAN.
#
#   scripts/start.sh          install, build and run the production server (port 3000)
#   scripts/start.sh --dev    run the Vite dev server instead (port 5173, hot reload)
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v mise >/dev/null 2>&1; then
	echo "mise is not installed: https://mise.jdx.dev/getting-started.html" >&2
	exit 1
fi

mode="prod"
case "${1:-}" in
	"") ;;
	--dev) mode="dev" ;;
	-h | --help)
		sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'
		exit 0
		;;
	*)
		echo "Unknown option: $1 (try --help)" >&2
		exit 2
		;;
esac

if [[ ! -f .env ]]; then
	echo "No .env found, using defaults (AllTalk at http://127.0.0.1:7851)." >&2
	echo "To change them: cp .env.example .env" >&2
fi

mise install
mise x -- pnpm install --frozen-lockfile

# Print where a phone can open it.
print_urls() {
	local port="$1"
	echo
	echo "Readhouse will be at:"
	echo "  http://localhost:${port}"
	if command -v ip >/dev/null 2>&1; then
		ip -4 -o addr show scope global | awk -v p="$port" '{ split($4, a, "/"); print "  http://" a[1] ":" p }'
	fi
	echo
}

if [[ "$mode" == "dev" ]]; then
	print_urls 5173
	exec mise run dev
fi

# PORT and HOST come from the environment first, then .env (as in the README).
from_env_file() {
	[[ -f .env ]] && sed -n "s/^$1=//p" .env | tail -n 1
	return 0
}
port="${PORT:-$(from_env_file PORT)}"
host="${HOST:-$(from_env_file HOST)}"

mise run build
if [[ "$host" == "127.0.0.1" || "$host" == "localhost" ]]; then
	echo
	echo "HOST=${host}: only this computer (and \`tailscale serve\`) can connect."
	echo
else
	print_urls "${port:-3000}"
fi
exec mise run start
