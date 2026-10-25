import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../scripts/Installer-DayZ-PC-1-clic.ps1',import.meta.url),'utf8');
const launcher=readFileSync(new URL('../scripts/INSTALLER-DAYZ-PC-UN-CLIC.cmd',import.meta.url),'utf8');

test('DayZ setup obtains real dedicated server only from Valve SteamCMD app 223350',()=>{
 assert.match(script,/steamcdn-a\.akamaihd\.net\/client\/installer\/steamcmd\.zip/);
 assert.match(script,/\+app_update' '223350' 'validate'/);
 assert.match(script,/Success! App '223350' fully installed/);
 assert.match(script,/appmanifest_223350\.acf/);
 assert.match(script,/DayZServer_x64\.exe/);
 assert.match(script,/StateFlags/);
});
test('DayZ official mission Chernarus is sourced from Bohemia with actual economy files',()=>{
 assert.match(script,/BohemiaInteractive\/DayZ-Central-Economy\/archive\/refs\/heads\/master\.zip/);
 assert.match(script,/dayzOffline\.chernarusplus/);
 assert.match(script,/db\\types\.xml/);
 assert.match(script,/db\\events\.xml/);
 assert.match(script,/serverDZ\.cfg/);
 assert.match(script,/class Missions/);
});
test('installation requires explicit local approval, does not fake hosting or delete saves',()=>{
 assert.match(script,/MessageBoxButtons\]::YesNo/);
 assert.match(script,/serverReady|publiclyReachable/);
 assert.match(script,/publiclyReachable=\$false/);
 assert.match(script,/Join-Path \$base 'cmd-dayz-personnel/);
 assert.doesNotMatch(script,/Remove-Item\s+[^\n]*(?:\$dir|\$mission|\$base|\$cfg|\$serverExe)/i);
 assert.match(script,/if\(!\(Test-Path -LiteralPath \$cfg/);
 assert.match(script,/if\(!\(Test-Path -LiteralPath \$launch/);
 assert.match(script,/ReparsePoint/);
 assert.match(script,/20GB/);
});
test('Windows CMD launcher never requires entering PowerShell code',()=>{
 assert.match(launcher,/powershell\.exe .* -File "%SCRIPT%"/);
 assert.match(launcher,/raw\.githubusercontent\.com\/znationcmd\/Cmd-hosting-\/main\/scripts\/Installer-DayZ-PC-1-clic\.ps1/);
});
