/**
 * CMD Hosting portable machine detection.
 * Read-only OS hints (Linux DMI; optional Windows CIM) without serial numbers.
 * CPU family is detected locally; host category remains advisory only.
 */
import os from "node:os";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const idRe=/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/;
const normalize=s=>String(s??"").trim().slice(0,160);
export function detectCpuFamily(cpuName=""){
 const s=normalize(cpuName);
 return /AMD.*EPYC/i.test(s)?"amd-epyc":/AMD.*Ryzen/i.test(s)?"amd-ryzen":/\bIntel\b/i.test(s)?"intel":"other";
}
export function inferMachineClass({manufacturer="",product="",cpuFamily="other",isVirtual=false}={}){
 const model=(normalize(manufacturer)+" "+normalize(product)).toLowerCase();
 // Explicit VM evidence wins; AMD EPYC/Ryzen alone cannot identify a Supermicro machine.
 if(isVirtual||/(^|[\s-])(kvm|qemu|virtualbox|vmware|hyper-v|virtual machine)([\s-]|$)/i.test(model))return "generic-vps";
 if(/supermicro|super micro/.test(model)){
   if(/microcloud|micro cloud/.test(model))return "supermicro-microcloud";
   if(/clouddc|cloud ?dc/.test(model))return "supermicro-clouddc";
   return cpuFamily==="amd-epyc"?"dedicated-epyc":"other-x64";
 }
 if(/lenovo.*ideapad/.test(model))return "existing-pc";
 if(cpuFamily==="amd-epyc")return "dedicated-epyc";
 if(cpuFamily==="amd-ryzen")return "dedicated-ryzen";
 return "other-x64";
}
function readLinuxDmi(){
 const read=p=>{try{return normalize(fs.readFileSync("/sys/class/dmi/id/"+p,"utf8"))}catch{return ""}};
 return {manufacturer:read("sys_vendor"),product:read("product_name"),
   chassis:read("chassis_type"),virtualization:""};
}
function readWindowsCim(){
 // Fully read-only CIM query; no changes and no machine serials.
 const code="Get-CimInstance Win32_ComputerSystem | Select-Object -Property Manufacturer,Model | ConvertTo-Json -Compress";
 try {
  const p=spawnSync("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive","-Command",code],
   {timeout:4500,encoding:"utf8",windowsHide:true,maxBuffer:32768});
  if(p.status!==0 || !p.stdout)return {};
  const data=JSON.parse(p.stdout);
  return {manufacturer:normalize(data.Manufacturer),product:normalize(data.Model)};
 }catch{return {}}
}
export function machineHardware({platform=os.platform(),cpuName=os.cpus()?.[0]?.model??"",
 machineClass=process.env.CMD_MACHINE_CLASS??"auto",
 chassisId=process.env.CMD_CHASSIS_ID??"",
 manufacturer=null,product=null}={}){
 const details=manufacturer!==null||product!==null?{manufacturer,product}:
   platform==="linux"?readLinuxDmi():platform==="win32"?readWindowsCim():{};
 const cpuFamily=detectCpuFamily(cpuName);
 const raw=String(machineClass||"auto").trim().toLowerCase();
 const kinds=new Set(["existing-pc","generic-vps","oracle-vm","dedicated-ryzen","dedicated-epyc",
  "supermicro-microcloud","supermicro-clouddc","other-x64"]);
 const detected=inferMachineClass({manufacturer:details.manufacturer,product:details.product,cpuFamily});
 if(raw!=="auto"&&!kinds.has(raw))throw Error("Invalid CMD_MACHINE_CLASS");
 const category=raw==="auto"?detected:raw;
 const group=normalize(chassisId);
 if(group&&!idRe.test(group))throw Error("Invalid CMD_CHASSIS_ID");
 // A MicroCloud chassis groups independent nodes, but never pools their RAM/disk.
 // Automatic detection alone does not prove two nodes share the same chassis.
 return {machineClass:category,cpuFamily,chassisId:category==="supermicro-microcloud"&&group?group:null,
   grouping:"per-independent-node",classificationSource:raw==="auto"?"hardware-hint":"owner-configured",
   chassisGroupingPending:category==="supermicro-microcloud"&&!group,
   remoteInstallationAuthorized:false};
}
