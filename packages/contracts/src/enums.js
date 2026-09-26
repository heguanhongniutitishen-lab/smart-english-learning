export const MasteryState = Object.freeze({S0:"S0",S1:"S1",S2:"S2",S3:"S3",S4:"S4"});
export const TaskTier = Object.freeze({CORE:"Core",STANDARD:"Standard",CHALLENGE:"Challenge"});
export const TaskStatus = Object.freeze({
  PENDING:"Pending", IN_PROGRESS:"InProgress", DONE:"Done", SKIPPED:"Skipped",
  DEFERRED_BY_SYSTEM:"DeferredBySystem", CANCELLED:"Cancelled", EXPIRED:"Expired"
});
export const EvidenceValidity = Object.freeze({VALID:"Valid",INVALID:"Invalid",PENDING_REVIEW:"PendingReview"});
export const TechnicalStatus = Object.freeze({
  OK:"OK", NETWORK_FAILURE:"NetworkFailure", AUDIO_FAILURE:"AudioFailure",
  SERVICE_FAILURE:"ServiceFailure", TIMEOUT:"Timeout"
});
