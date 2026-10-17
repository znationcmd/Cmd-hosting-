"""Build public UI variable values; does not deploy or read credentials."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
public = root / 'web/public'
css = (root / 'ui/premium-16k.css').read_text()
js = (root / 'ui/premium-16k.js').read_text()
# CSS is embedded in an existing public script, not fetched from a new route.
start = js.index(' const file=')
end = js.index(' document.documentElement.classList.add', start)
js = js[:start] + js[end:]
style = '\n;(()=>{const s=document.createElement("style");s.id="cmd-premium-release-20261017";s.textContent=' + json.dumps(css) + ';document.head.append(s)})();\n'
values = {
    'CMD_CONSOLE_UI_JS': (public / 'console-ui.js').read_text(),
    'CMD_HOSTING_UI_JS': (public / 'hosting-ui.js').read_text() + '\n;' + js,
    'CMD_PROFILE_DONATIONS_SCRIPT': (public / 'profile-donations.js').read_text() + style,
}
assert all(len(value) < 32768 for value in values.values())
print(json.dumps(values))
