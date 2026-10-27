// Palworld dedicated server: update only its own INI section; preserve unrelated settings.
// This prepares activation; PalServer loads mods only after a real restart.
const PACKAGE=/^[A-Za-z0-9_.-]{1,100}$/;
export function togglePalworldModSettings(source,packageName,enabled){
 if(typeof source!=='string'||source.length>2_000_000)throw new Error('Configuration Palworld invalide');
 if(typeof packageName!=='string'||!PACKAGE.test(packageName))throw new Error('PackageName invalide');
 if(typeof enabled!=='boolean')throw new Error('Activation invalide');
 const eol=source.includes('\r\n')?'\r\n':'\n';
 const lines=source.replace(/\r\n/g,'\n').split('\n');
 const headers=lines.flatMap((line,i)=>/^\s*\[([^\]]+)\]\s*$/.test(line)?[{i,name:line.match(/^\s*\[([^\]]+)\]\s*$/)[1].toLowerCase()}]:[]);
 const sections=headers.filter(h=>h.name==='palmodsettings');
 if(sections.length!==1)throw new Error('Section [PalModSettings] manquante ou ambiguë');
 const begin=sections[0].i,end=headers.find(h=>h.i>begin)?.i??lines.length;
 const before=lines.slice(0,begin+1),section=lines.slice(begin+1,end),after=lines.slice(end);
 const active=[];
 for(const line of section){
  const m=/^\s*ActiveModList\s*=\s*(.*?)\s*$/i.exec(line);
  if(!m)continue;
  if(!PACKAGE.test(m[1]))throw new Error('ActiveModList existante invalide : édition manuelle nécessaire');
  if(!active.includes(m[1]))active.push(m[1]);
 }
 const result=active.filter(n=>n!==packageName);
 if(enabled)result.push(packageName);
 const seen=new Set();
 const clean=result.filter(n=>{if(seen.has(n))return false;seen.add(n);return true});
 const rest=section.filter(line=>!/^\s*(?:ActiveModList|bGlobalEnableMod)\s*=/i.test(line));
 const output=[...before,'bGlobalEnableMod='+(clean.length?'true':'false'),
   ...clean.map(n=>'ActiveModList='+n),...rest,...after].join(eol);
 return {content:output,activePackageNames:clean,enabledGlobal:clean.length>0,changed:output!==source};
}
