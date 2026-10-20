/**
 * CMD Hosting / Oracle Cloud Always Free 2026 (conservative, offline advisor).
 * Oracle's current Always Free A1 quota: 2 ARM OCPUs, 12 GiB RAM total per tenancy.
 * This file DOES NOT access OCI, create VMs, allocate ports, or launch games.
 */
export const ORACLE_ALWAYS_FREE = Object.freeze({
  provider: "oracle",
  shape: "VM.Standard.A1.Flex",
  architecture: "arm64",
  platform: "linux",
  maxTotalOcpus: 2,
  maxTotalMemoryGB: 12,
  maxBlockVolumeGB: 200,
  capacityGuaranteed: false,
  pricingVerifiedInAccount: false,
  quotaSource: "https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm"
});

const FINITE_POSITIVE = x => typeof x === "number" && Number.isFinite(x) && x >= 0;
const ALLOWED_GAMES = new Set(["anomalia", "anomalia-primeval", "minecraft-java"]);

export function oracleFreeAssessment({
  gameKey = "anomalia",
  vmOcpus = null,
  vmMemoryGB = null,
  vmFreeDiskGB = null,
  os = "linux",
  arch = "arm64",
  vmEnrolled = false,
  executableVerified = false,
  gameServerTested = false,
  deployedOcpus = 0,
  deployedMemoryGB = 0,
  officialAlwaysFreeEligible = false
} = {}) {
  const key = String(gameKey).trim().toLowerCase();
  if (!ALLOWED_GAMES.has(key)) return {
    status: "game_not_evaluated", provider: "oracle",
    canLaunch: false, canRent: false, reasonCodes: ["game_not_evaluated"],
    note: "No guess about another game's ARM server binaries."
  };
  const reasons = [];
  if (os !== "linux") reasons.push("unsupported_os");
  if (arch !== "arm64") reasons.push("not_a1_arm64_instance");
  if (!vmEnrolled) reasons.push("vm_not_enrolled");
  if (!officialAlwaysFreeEligible) reasons.push("always_free_eligibility_not_verified");

  if (vmOcpus === null || !FINITE_POSITIVE(vmOcpus) || vmOcpus < 1) reasons.push("ocpu_not_verified");
  if (vmMemoryGB === null || !FINITE_POSITIVE(vmMemoryGB) || vmMemoryGB < 1) reasons.push("memory_not_verified");
  if (vmFreeDiskGB === null || !FINITE_POSITIVE(vmFreeDiskGB) || vmFreeDiskGB < 1) reasons.push("disk_not_verified");
  if (!FINITE_POSITIVE(deployedOcpus) || !FINITE_POSITIVE(deployedMemoryGB)) reasons.push("usage_unknown");
  if (FINITE_POSITIVE(vmOcpus) && FINITE_POSITIVE(deployedOcpus)
      && vmOcpus + deployedOcpus > ORACLE_ALWAYS_FREE.maxTotalOcpus) reasons.push("free_ocpu_quota_exceeded");
  if (FINITE_POSITIVE(vmMemoryGB) && FINITE_POSITIVE(deployedMemoryGB)
      && vmMemoryGB + deployedMemoryGB > ORACLE_ALWAYS_FREE.maxTotalMemoryGB) reasons.push("free_ram_quota_exceeded");

  // ARM64 is not x86-64: do not claim the Windows/editor build works on OCI.
  if (key.startsWith("anomalia")) {
    if (!executableVerified) reasons.push("native_linux_arm64_server_build_missing");
    if (!gameServerTested) reasons.push("native_arm64_game_server_not_tested");
  } else if (!gameServerTested) {
    reasons.push("game_server_not_tested");
  }

  // Even a verified binary is not a proof that this many players or the world will fit.
  const canLaunch = reasons.length === 0;
  return {
    status: canLaunch ? "technical_review_required" : "blocked_pending_validation",
    provider: "oracle", gameKey: key, machineClass: "oracle-vm",
    plan: "always-free", os, arch, canLaunch: false, canRent: false,
    reasonCodes: reasons,
    requestedResources: {vmOcpus, vmMemoryGB, vmFreeDiskGB},
    freeTierLimits: {...ORACLE_ALWAYS_FREE},
    note: canLaunch
      ? "Checks passed on self-reported inputs only. Must review OCI quotas, port exposure, CPU/RAM load, licensing and live dedicated-server test before enabling launch."
      : "No Oracle VM/instance created; no rental, server, game installation or price is implied."
  };
}
