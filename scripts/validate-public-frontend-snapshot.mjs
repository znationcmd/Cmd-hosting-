#!/usr/bin/env node
/**
 * Safety gate for an UNAUTHENTICATED, PUBLIC frontend-only backup.
 * Stop before copying assets into GitHub if they appear to contain credentials.
 */
import {readdir,readFile,lstat} from "node:fs/promises";
import {resolve,relative,join,sep} from "node:path";

const root=resolve(process.argv[2]||"recovery-public-only");
const maxTotal=40*1024*1024, maxFiles=75;let total=0,count=0;
const secretPatterns=[
  ["private key",/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i],
  ["GitHub token",/(?:gh[pousr]_|github_pat_)[A-Za-z0-9_-]{20,}/],
  ["OpenAI API token",/\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/],
  ["Anthropic API token",/\bsk-ant-[A-Za-z0-9_-]{24,}\b/],
  ["Stripe private token",/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/],
  ["AWS access key",/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["Hugging Face secret",/\bhf_[A-Za-z0-9]{28,}\b/],
  ["Railway token",/\b(?:railway|RWY)[_-]?(?:token|api[_-]?key)\s*[:=]\s*["'][a-zA-Z0-9_-]{25,}/i],
  ["JWT",/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/],
  ["Bearer token literal",/\bBearer [A-Za-z0-9_~+\/-]{40,}/],
  ["database URL credential",/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^:\s\/@]+:[^@\s\/]+@/i]
];
const allowed=/\.(?:html|js|css|webmanifest|png|ico|svg|webp|jpg|jpeg|json)$/;
const all=[];
async function walk(dir){
 for(const name of await readdir(dir)){
  const abs=join(dir,name),rel=relative(root,abs),stat=await lstat(abs);
  if(stat.isSymbolicLink())throw Error("Symlink forbidden: "+rel);
  if(stat.isDirectory()){await walk(abs);continue}
  if(!stat.isFile()||!allowed.test(name))throw Error("Unexpected file "+rel);
  const real=resolve(abs);
  if(!real.startsWith(root+sep))throw Error("Path escaped backup root");
  total+=stat.size;count++;
  if(count>maxFiles||total>maxTotal||stat.size>4*1024*1024)throw Error("Snapshot size limit");
  if(/\.(?:html|js|css|webmanifest|svg|json)$/.test(name)){
    const content=await readFile(abs,"utf8");
    for(const [id,regex] of secretPatterns)if(regex.test(content))throw Error("Potential "+id+" in "+rel+": aborting publish");
  }
  all.push(rel);
 }
}
await walk(root);
if(!all.includes("manifest.json")||!all.includes("index.html"))throw Error("Incomplete public snapshot: no manifest/home page");
console.log("Public snapshot safety check passed: "+count+" files, "+total+" bytes. No secrets detected by heuristic scanner.");
