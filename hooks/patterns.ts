// Shapes of shell command that auto mode commonly blocks. Each matches the
// risky part alone, so that part can be told from a long command around it.
const REST = String.raw`[^\n;&|]*`

export const PATTERNS: readonly string[] = [
  // a download piped into a shell or interpreter
  String.raw`\b(curl|wget)\b${REST}\|\s*(sudo\s+)?(env\s+)?(ba|z|da|k)?sh\b${REST}`,
  String.raw`\b(curl|wget)\b${REST}\|\s*(sudo\s+)?(python[\d.]*|perl|ruby|node)\b${REST}`,
  String.raw`\b(ba|z)?sh\s+(-c\s+)?["']?\$\((curl|wget)\b[^)]*\)["']?`,
  String.raw`\bsudo\b${REST}`,
  String.raw`\bsu\s+(-\s+)?(root\b|-c\b)${REST}`,
  // deleting and overwriting
  String.raw`\brm\s+(-{1,2}[\w-]+\s+)*-(-recursive|-force|[a-zA-Z]*[rRf][a-zA-Z]*)\b${REST}`,
  String.raw`\bfind\b${REST}\s-(delete|exec\s+rm)\b${REST}`,
  String.raw`\b(shred|mkfs(\.\w+)?|wipefs|fdisk|parted)\b${REST}`,
  String.raw`\bdd\b${REST}\bof=${REST}`,
  String.raw`>\s*/dev/(sd|nvme|hd|mmcblk)\w*`,
  String.raw`\btruncate\s+(-s|--size)\s*0${REST}`,
  // git history and remotes
  String.raw`\bgit\s+push\b${REST}(\s--force(-with-lease)?\b|\s-f\b|\s--delete\b|\s--mirror\b)${REST}`,
  String.raw`\bgit\s+push\b${REST}\s\+\S+${REST}`,
  String.raw`\bgit\s+reset\s+--hard\b${REST}`,
  String.raw`\bgit\s+clean\s+(-\w*\s+)*-\w*f\w*${REST}`,
  String.raw`\bgit\s+(filter-branch|filter-repo)\b${REST}`,
  String.raw`\bgit\s+branch\s+-D\b${REST}`,
  String.raw`\bgit\s+(checkout|restore)\s+(--\s+)?\.(?=\s|$)`,
  // permissions and system state
  String.raw`\bchmod\s+(-\w+\s+)*[0-7]?777\b${REST}`,
  String.raw`\bchmod\s+(-\w+\s+)*[ugoa]*\+s\b${REST}`,
  String.raw`\bchown\s+(-\w+\s+)*-R\b${REST}`,
  String.raw`\b(shutdown|reboot|poweroff|halt)\b${REST}`,
  String.raw`\bsystemctl\s+(stop|disable|mask|restart)\b${REST}`,
  String.raw`\b(kill\s+-(9|KILL)|pkill|killall)\b${REST}`,
  String.raw`\b(crontab\s+-r|iptables\s+-F|ufw\s+disable|setenforce\s+0)\b${REST}`,
  // credentials and secrets
  String.raw`\S*(\.ssh/|id_(rsa|ed25519|ecdsa)\b|\.aws/credentials|\.netrc\b|\.gnupg/|\.kube/config|\.docker/config\.json)\S*`,
  String.raw`/etc/(passwd|shadow|sudoers(\.d/\S*)?)\b`,
  String.raw`\b(cat|less|head|tail|cp|scp|base64|xxd)\b${REST}\.env\b${REST}`,
  String.raw`\b(printenv|env)\b\s*\|${REST}`,
  String.raw`\bgh\s+auth\s+token\b${REST}`,
  String.raw`\bsecurity\s+find-(generic|internet)-password\b${REST}`,
  // sending data out, remote shells
  String.raw`\b(curl|wget)\b${REST}(\s-(d|F|T)\b|\s--(data(-\w+)?|form|upload-file)\b|\s-X\s*(POST|PUT|DELETE)\b)${REST}`,
  String.raw`\b(nc|ncat|netcat)\b${REST}\s-\w*e\b${REST}`,
  String.raw`/dev/(tcp|udp)/\S+`,
  String.raw`\b(scp|rsync)\b${REST}\s\S+@\S+:${REST}`,
  String.raw`\bssh\s+(-\S+\s+)*\S+@\S+${REST}`,
  // running what was just decoded or fetched
  String.raw`\bbase64\s+(-d|--decode|-D)\b${REST}\|\s*(ba|z)?sh\b${REST}`,
  String.raw`\beval\s+["']?\$\(${REST}`,
  // publishing and infrastructure
  String.raw`\b(npm|yarn|pnpm|cargo|twine|gem)\s+(publish|upload|push)\b${REST}`,
  String.raw`\bterraform\s+(destroy|apply)\b${REST}`,
  String.raw`\bkubectl\s+(delete|drain|apply|replace)\b${REST}`,
  String.raw`\bdocker\s+(system\s+prune|volume\s+rm|rm\s+-f)\b${REST}`,
  String.raw`\bdocker\s+run\b${REST}(--privileged|-v\s+/:/|/var/run/docker\.sock)${REST}`,
  String.raw`\bgh\s+(repo\s+delete|release\s+delete|secret\s+set)\b${REST}`,
  String.raw`\baws\s+\S+\s+(delete|terminate|rm)\S*${REST}`,
  String.raw`\b(DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE|DELETE\s+FROM)\b[^;\n"']*`,
  // settings that widen what Claude may do
  String.raw`\S*\.claude/settings(\.local)?\.json\S*`,
  String.raw`--dangerously-skip-permissions\b`,
  String.raw`--no-verify\b`,
]
