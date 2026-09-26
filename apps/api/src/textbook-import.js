import {randomUUID} from "node:crypto";import {normalizeImportRow,validateImportRow} from "./curriculum-validation.js";
export function prepareImportRows(importJobId,rows){
 return rows.map((raw,index)=>{const normalized=normalizeImportRow(raw),check=validateImportRow(normalized);return {import_row_id:randomUUID(),import_job_id:importJobId,row_number:index+1,raw_payload:raw,normalized_payload:normalized,validation_status:check.valid?"Valid":"Invalid",validation_errors:check.errors,review_status:"Pending"};});
}
export function canPublishImport(job,rows){
 if(job.status!=="Reviewed")return {ok:false,reason:"JOB_NOT_REVIEWED"};
 if(rows.length===0)return {ok:false,reason:"NO_ROWS"};
 if(rows.some(x=>x.validation_status!=="Valid"))return {ok:false,reason:"INVALID_ROWS"};
 if(rows.some(x=>x.review_status!=="Approved"))return {ok:false,reason:"ROWS_NOT_APPROVED"};
 return {ok:true};
}
