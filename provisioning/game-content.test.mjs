import test from "node:test";
import assert from "node:assert/strict";
import {gameKey,mapsForGame,validateContentSelection} from "./game-content.mjs";
test("DayZ PC maps and no ARK maps",()=>{
 const offer=mapsForGame("dayz","pc");
 assert.equal(offer.status,"supported_catalogue");
 assert.ok(offer.maps.some(x=>x.mission==="dayzOffline.chernarusplus"));
 assert.ok(!offer.maps.some(x=>x.level==="TheIsland_WP"));
 assert.equal(validateContentSelection({game:"dayz",platform:"pc",mapId:"the-island"}).reason,"map_not_available_for_game");
});
test("ARK Ascended defaults to Island and supports Astraeos only with published mod",()=>{
 const d=validateContentSelection({game:"ark-asa",platform:"crossplay",mods:["123456"]});
 assert.equal(d.ok,true);
 assert.equal(d.map.level,"TheIsland_WP");
 assert.equal(d.modProvider,"curseforge-asa");
 assert.equal(validateContentSelection({game:"ark-asa",mapId:"astraeos"}).reason,"map_publisher_mod_required");
 assert.equal(validateContentSelection({game:"ark-asa",mapId:"astraeos",mods:["123456"]}).ok,true);
});
test("No DayZ mods in ARK or Bohemia IDs mixed",()=>{
 assert.equal(validateContentSelection({game:"dayz",mapId:"chernarusplus",mods:["AA567890"]}).reason,"invalid_mod_id");
 assert.equal(validateContentSelection({game:"arma-reforger",mods:["123456"]}).reason,"invalid_mod_id");
 assert.equal(validateContentSelection({game:"arma-reforger",mods:["A1B2C3D4E5F6A7B8"]}).ok,true);
});
test("DayZ console providers are not installed with Windows SteamCMD",()=>{
 for(const platform of ["ps5","xbox","nintendo"]){
  assert.equal(mapsForGame("dayz",platform).status,"platform_provider_required");
  assert.equal(validateContentSelection({game:"dayz",platform,mapId:"chernarusplus"}).ok,false);
 }
});
test("7DTD generates worlds via publisher only, mods need review",()=>{
 const g=validateContentSelection({game:"7dtd",mapId:"random-world"});
 assert.equal(g.map.generated,true);
 assert.equal(g.contentInstalled,false);
 assert.equal(validateContentSelection({game:"7dtd",mods:["354253"]}).reason,"mods_require_publisher_review");
});
test("Invalid, overflowed or duplicated mod IDs rejected or canonicalized",()=>{
 assert.equal(validateContentSelection({game:"dayz",mods:["../../etc/passwd"]}).ok,false);
 assert.equal(validateContentSelection({game:"dayz",mods:Array.from({length:101},(_,i)=>String(i+1))}).ok,false);
 const g=validateContentSelection({game:"dayz",mods:["123456","123456","654321"]});
 assert.deepEqual(g.modIds,["123456","654321"]);
 assert.equal(g.modsVerified,false);
});
test("ARK ASE and ASA have completely different map identifier spaces",()=>{
 const ase=mapsForGame("ark-ase"),asa=mapsForGame("ark-asa");
 assert.equal(ase.maps.find(x=>x.id==="the-island").level,"TheIsland");
 assert.equal(asa.maps.find(x=>x.id==="the-island").level,"TheIsland_WP");
 assert.notEqual(gameKey("ark-ase"),gameKey("ark-asa"));
});
test("Unknown games are never treated as provisioned",()=>{
 assert.equal(mapsForGame("fake", "pc").status,"unsupported_game");
 assert.equal(validateContentSelection({game:"fake",mapId:"nope"}).ok,false);
});
