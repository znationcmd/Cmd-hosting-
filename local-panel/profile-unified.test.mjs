import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('local hosting profile interface includes PC pairing information and per-game sections',async()=>{
 const [ui,js,server]=await Promise.all([
  readFile(new URL('./index.html',import.meta.url),'utf8'),
  readFile(new URL('./profile-unified.js',import.meta.url),'utf8'),
  readFile(new URL('./server.mjs',import.meta.url),'utf8')
 ]);
 for(const id of ['pcConnection','profileWorkspace','profileOpenFiles','profileOpenMods',
 'profileOpenMaps','profileOpenConsole'])assert.match(ui,new RegExp('id="'+id+'"'));
 assert.match(ui,/profile-unified\\.js/);
 assert.match(js,/CMDLocalProfile/);
 assert.match(server,/api\\/profile\\/workshop/);
 assert.match(server,/remoteInternetEnabled:false/);
});
