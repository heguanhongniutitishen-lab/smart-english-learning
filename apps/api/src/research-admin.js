import {randomUUID} from "node:crypto";import {prepareImportRows,canPublishImport} from "./textbook-import.js";
export class ResearchAdminService{
 constructor(repo){this.repo=repo;}
 async createImportJob(input,actor){return this.repo.createImportJob({import_job_id:randomUUID(),...input,created_by:actor,status:"Draft"});}
 async stageRows(jobId,rows){const prepared=prepareImportRows(jobId,rows);await this.repo.insertImportRows(prepared);return {total:prepared.length,valid:prepared.filter(x=>x.validation_status==="Valid").length,invalid:prepared.filter(x=>x.validation_status==="Invalid").length};}
 async reviewRow(rowId,approved,actor){return this.repo.reviewImportRow(rowId,{review_status:approved?"Approved":"Rejected",reviewed_by:actor});}
 async publishImport(jobId,actor){const job=await this.repo.getImportJob(jobId),rows=await this.repo.listImportRows(jobId),gate=canPublishImport(job,rows);if(!gate.ok)throw Object.assign(new Error(gate.reason),{code:"IMPORT_NOT_PUBLISHABLE",status:409});return this.repo.publishImport(jobId,actor);}
}
