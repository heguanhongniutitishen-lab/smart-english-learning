function clamp(x,a=0,b=1){return Math.max(a,Math.min(b,x));}
export class DiagnosticCalibrationService{
 constructor(pool,o={}){this.pool=pool;this.modelVersion=o.modelVersion??"diagnostic-calibration-v1";this.promoteConfidence=o.promoteConfidence??.75;this.priorConfidence=o.priorConfidence??.45;this.minPromoteEvidence=o.minPromoteEvidence??3;this.minPriorEvidence=o.minPriorEvidence??1;}
 decide(e){const c=Number(e.confidence),n=Number(e.evidence_count);if(c>=this.promoteConfidence&&n>=this.minPromoteEvidence)return{decision:"Promote",reason:"SUFFICIENT_DIAGNOSTIC_EVIDENCE"};if(c>=this.priorConfidence&&n>=this.minPriorEvidence)return{decision:"PriorOnly",reason:"USE_AS_INITIAL_PRIOR"};return{decision:"Insufficient",reason:"INSUFFICIENT_EVIDENCE"};}
 toAbilityScore(estimate){return clamp((Number(estimate)-1)*25,0,100);}
}
