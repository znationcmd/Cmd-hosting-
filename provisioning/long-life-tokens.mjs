/**
 * CMD Hosting — long-life API token policy, independent from PC/Mods agent credentials.
 * Public-facing brand name: Jetons API longue durée.
 * The API returns the secret exactly once; only its SHA-256 fingerprint is persisted.
 */
import {createHash,randomBytes} from "node:crypto";

export const LONG_LIFE_SCOPES=Object.freeze(["account:read","services:read","rentals:read"]);
export const LONG_LIFE_YEARS=Object.freeze([1,3,5,10]);
export function validateTokenRequest(data){
 if(!data || typeof data!=="object" || Array.isArray(data))throw Error("invalid_token_request");
 const accountId=typeof data.accountId==="string"?data.accountId.trim():"";
 const label=typeof data.label==="string"?data.label.trim():"";
 if(!/^[a-zA-Z0-9._-]{1,100}$/.test(accountId))throw Error("invalid_account_id");
 if(!label || label.length>80 || /[\u0000-\u001F\u007F]/.test(label))throw Error("invalid_token_label");
 if(!LONG_LIFE_YEARS.includes(data.years))throw Error("invalid_token_lifetime");
 if(!Array.isArray(data.scopes)||!data.scopes.length||data.scopes.length>LONG_LIFE_SCOPES.length
   ||!data.scopes.every(x=>LONG_LIFE_SCOPES.includes(x))||new Set(data.scopes).size!==data.scopes.length)
   throw Error("invalid_token_scope");
 const serviceId= data.serviceId==null ? null : String(data.serviceId);
 if(serviceId!==null&&!/^[a-zA-Z0-9._-]{1,100}$/.test(serviceId))throw Error("invalid_service_id");
 return {accountId,label,years:data.years,scopes:[...data.scopes],serviceId};
}
export function generateLongLifeSecret(){
 return "cmd_llt_"+randomBytes(36).toString("base64url");
}
export function fingerprint(secret){
 if(typeof secret!=="string"||!/^cmd_llt_[A-Za-z0-9_-]{48}$/.test(secret))return null;
 return createHash("sha256").update(secret,"utf8").digest("hex");
}
export function canUseToken(token,{scope,serviceId=null,now=Date.now()}={}){
 if(!token||token.revokedAt||!token.accountId||!Array.isArray(token.scopes))return false;
 if(!Number.isFinite(now)||new Date(token.expiresAt).getTime()<=now)return false;
 if(!LONG_LIFE_SCOPES.includes(scope)||!token.scopes.includes(scope))return false;
 if(token.serviceId && serviceId!==token.serviceId)return false;
 return true;
}
export function publicMetadata(dbRow){
 return {id:String(dbRow.id),accountId:String(dbRow.account_id),label:String(dbRow.label),
  scopes:Array.isArray(dbRow.scopes)?dbRow.scopes:[],serviceId:dbRow.service_id??null,
  createdAt:dbRow.created_at,expiresAt:dbRow.expires_at,lastUsedAt:dbRow.last_used_at??null,
  revoked:dbRow.revoked_at!=null,prefix:dbRow.token_prefix};
}
