import test from "node:test";
import assert from "node:assert/strict";
import {detectCpuFamily,inferMachineClass,machineHardware} from "./machine-detection.mjs";
test("AMD processor model detection does not invent CPU cores, server capacity or provider",()=>{
 assert.equal(detectCpuFamily("AMD EPYC 9474F 48-Core Processor"),"amd-epyc");
 assert.equal(detectCpuFamily("AMD Ryzen 9 7950X"),"amd-ryzen");
 assert.equal(detectCpuFamily("Intel(R) Core(TM) i5-1155G7"),"intel");
 assert.equal(detectCpuFamily("mystery processor"),"other");
});
test("Supermicro MicroCloud and CloudDC detected from manufacturer and product",()=>{
 assert.equal(inferMachineClass({manufacturer:"Supermicro",product:"MicroCloud",cpuFamily:"amd-ryzen"}),"supermicro-microcloud");
 assert.equal(inferMachineClass({manufacturer:"Super Micro Computer",product:"CloudDC",cpuFamily:"amd-epyc"}),"supermicro-clouddc");
 assert.equal(inferMachineClass({manufacturer:"LENOVO",product:"IdeaPad 3 14ITL6"}),"existing-pc");
});
test("Ryzen and EPYC inferred without claiming a Supermicro motherboard",()=>{
 assert.equal(inferMachineClass({cpuFamily:"amd-ryzen"}),"dedicated-ryzen");
 assert.equal(inferMachineClass({cpuFamily:"amd-epyc"}),"dedicated-epyc");
});
test("Virtual machines remain VM even with EPYC CPU",()=>{
 assert.equal(inferMachineClass({manufacturer:"QEMU",product:"Standard PC",cpuFamily:"amd-epyc"}),"generic-vps");
});
test("microcloud group remains unassigned rather than guessing physical chassis identity",()=>{
 const a=machineHardware({platform:"linux",cpuName:"AMD EPYC 9474F",manufacturer:"Supermicro",product:"MicroCloud",chassisId:""});
 assert.equal(a.machineClass,"supermicro-microcloud");
 assert.equal(a.chassisId,null);
 assert.equal(a.chassisGroupingPending,true);
 assert.equal(a.remoteInstallationAuthorized,false);
});
test("chassis group set during enrollment keeps nodes separate",()=>{
 const a=machineHardware({platform:"linux",cpuName:"AMD EPYC 9474F",manufacturer:"Supermicro",product:"MicroCloud",chassisId:"chassis123"});
 assert.equal(a.chassisId,"chassis123");
 assert.equal(a.grouping,"per-independent-node");
 assert.equal(a.chassisGroupingPending,false);
});
test("owner override is accepted but unsafe labels rejected",()=>{
 assert.equal(machineHardware({machineClass:"oracle-vm",manufacturer:"Unknown",product:"Unknown"}).machineClass,"oracle-vm");
 assert.throws(()=>machineHardware({machineClass:"rm -rf /"}),/Invalid/);
 assert.throws(()=>machineHardware({machineClass:"supermicro-microcloud",chassisId:"../escape"}),/Invalid/);
});
