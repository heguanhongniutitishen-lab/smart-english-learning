export class RecoveryIntegrityService{
 constructor(pool){this.pool=pool;}
 async check(){
  const [evidenceValidity,mastery,ability,recalc,outbox]=await Promise.all([
   this.pool.query(`SELECT count(*)::int total,
    count(*) FILTER(WHERE v.evidence_id IS NULL)::int missing_validity
    FROM evidences e LEFT JOIN evidence_validity v USING(evidence_id)`),
   this.pool.query(`WITH expected AS (
      SELECT e.student_id,e.target_id knowledge_id,count(*)::int evidence_count
      FROM evidences e JOIN evidence_validity v USING(evidence_id)
      WHERE v.status='Valid' AND e.target_type='Knowledge' GROUP BY e.student_id,e.target_id
    )
    SELECT count(*) FILTER(WHERE m.student_id IS NULL)::int missing_projection,
           count(*) FILTER(WHERE m.student_id IS NOT NULL AND m.evidence_count<>x.evidence_count)::int count_mismatch
    FROM expected x LEFT JOIN mastery_records m USING(student_id,knowledge_id)`),
   this.pool.query(`WITH expected AS (
      SELECT e.student_id,e.target_id ability_id,count(*)::int evidence_count
      FROM evidences e JOIN evidence_validity v USING(evidence_id)
      WHERE v.status='Valid' AND e.target_type='Ability' GROUP BY e.student_id,e.target_id
    )
    SELECT count(*) FILTER(WHERE a.student_id IS NULL)::int missing_projection,
           count(*) FILTER(WHERE a.student_id IS NOT NULL AND a.evidence_count<>x.evidence_count)::int count_mismatch
    FROM expected x LEFT JOIN ability_states a USING(student_id,ability_id)`),
   this.pool.query(`SELECT count(*) FILTER(WHERE v.recalc_required AND j.job_id IS NULL)::int missing_jobs,
    count(*) FILTER(WHERE v.recalc_required AND j.status='Completed')::int completed_but_required
    FROM evidence_validity v LEFT JOIN state_recalculation_jobs j USING(evidence_id)`),
   this.pool.query(`SELECT count(*) FILTER(WHERE processed_at IS NULL AND dead_lettered_at IS NULL)::int unprocessed,
    count(*) FILTER(WHERE dead_lettered_at IS NOT NULL)::int dead_letter FROM outbox_events`)
  ]);
  const details={evidence:evidenceValidity.rows[0],mastery:mastery.rows[0],ability:ability.rows[0],recalculation:recalc.rows[0],outbox:outbox.rows[0]};
  const blockers=Number(details.evidence.missing_validity)+Number(details.mastery.missing_projection)+Number(details.mastery.count_mismatch)+Number(details.ability.missing_projection)+Number(details.ability.count_mismatch)+Number(details.recalculation.missing_jobs)+Number(details.recalculation.completed_but_required);
  return{ok:blockers===0,blockers,details};
 }
}
