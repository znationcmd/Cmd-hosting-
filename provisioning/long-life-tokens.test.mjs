import test from "node:test";
import assert from "node:assert/strict";
import {LONG_LIFE_SCOPES,validateTokenRequest,generateLongLifeSecret,fingerprint,canUseToken,publicMetadata} from "./long-life-tokens.mjs";
const valid={accountId:"account_123",label:"Mon bot de statistiques",years:5,
 scopes:["rentals:read","services:read"],serviceId:"game_9"};
test("safe long-life tokens: 288-bit independent secrets with one-way fingerprints",()=>{
 const a=generateLongLifeSecret(),b=generateLongLifeSecret();
 assert.match(a,/^cmd_llt_[A-Za-z0-9_-]{48}$/);
 assert.notEqual(a,b);
 assert.match(fingerprint(a),/^[0-9a-f]{64}$/);
 assert.notEqual(fingerprint(a),a);
 assert.equal(fingerprint("not-a-token"),null);
});
test("exactly 1, 3, 5 or 10 year expirations, no accidental never-expiring tokens",()=>{
 for(const years of [1,3,5,10])assert.equal(validateTokenRequest({...valid,years}).years,years);
 for(const years of [0,2,11,null,-1])assert.throws(()=>validateTokenRequest({...valid,years}),/lifetime/);
});
test("only read-only scopes for currently implemented endpoints; prevent leaked admin privileges",()=>{
 assert.deepEqual([...LONG_LIFE_SCOPES],["account:read","services:read","rentals:read"]);
 assert.throws(()=>validateTokenRequest({...valid,scopes:["*"]}),/scope/);
 assert.throws(()=>validateTokenRequest({...valid,scopes:["servers:control"]}),/scope/);
 assert.throws(()=>validateTokenRequest({...valid,scopes:["rentals:read","rentals:read"]}),/scope/);
});
test("account and service identifiers validated and cannot cross account boundaries",()=>{
 assert.throws(()=>validateTokenRequest({...valid,accountId:"../../secrets"}),/account/);
 assert.throws(()=>validateTokenRequest({...valid,serviceId:"../../escape"}),/service/);
 assert.throws(()=>validateTokenRequest({...valid,label:"bad\nvalue"}),/label/);
 assert.equal(validateTokenRequest(valid).serviceId,"game_9");
});
test("a service-pinned token cannot access another game, and expires or revokes immediately",()=>{
 const base={accountId:"account_123",serviceId:"game_9",scopes:["rentals:read"],
   expiresAt:"2031-10-11T00:00:00.000Z",revokedAt:null};
 const now=Date.parse("2026-10-11T00:00:00.000Z");
 assert.equal(canUseToken(base,{scope:"rentals:read",serviceId:"game_9",now}),true);
 assert.equal(canUseToken(base,{scope:"rentals:read",serviceId:"game_10",now}),false);
 assert.equal(canUseToken(base,{scope:"services:read",serviceId:"game_9",now}),false);
 assert.equal(canUseToken(base,{scope:"rentals:read",serviceId:"game_9",now:Date.parse(base.expiresAt)}),false);
 assert.equal(canUseToken({...base,revokedAt:"2026-10-10"},{scope:"rentals:read",serviceId:"game_9",now}),false);
});
test("listing token metadata never includes secrets or token hashes",()=>{
 const publicView=publicMetadata({id:"123",account_id:"account_123",label:"my bot",
  scopes:["account:read"],token_hash:"secret hash",token_prefix:"cmd_llt",created_at:"2026-10-11",
  expires_at:"2031-10-11",revoked_at:null});
 assert.equal(publicView.revoked,false);
 assert.ok(!JSON.stringify(publicView).includes("secret hash"));
 assert.ok(!("secret" in publicView));
});
