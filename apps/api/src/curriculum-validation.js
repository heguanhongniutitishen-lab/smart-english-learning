const TYPES=new Set(["Word","Phrase","SentencePattern","Grammar","Dialogue","Reading","Listening","Writing","Other"]);
export function validateImportRow(row){
 const errors=[];
 if(!row.unit_code)errors.push({field:"unit_code",code:"REQUIRED"});
 if(!row.content_type||!TYPES.has(row.content_type))errors.push({field:"content_type",code:"INVALID_TYPE"});
 if(!row.content_text)errors.push({field:"content_text",code:"REQUIRED"});
 if(row.section_code!=null&&typeof row.section_code!=="string")errors.push({field:"section_code",code:"INVALID"});
 return {valid:errors.length===0,errors};
}
export function normalizeImportRow(row){
 return {unit_code:String(row.unit_code??"").trim(),section_code:row.section_code?String(row.section_code).trim():null,content_type:String(row.content_type??"").trim(),content_text:String(row.content_text??"").trim(),translation:row.translation?String(row.translation).trim():null,knowledge_codes:Array.isArray(row.knowledge_codes)?row.knowledge_codes:[],ability_codes:Array.isArray(row.ability_codes)?row.ability_codes:[]};
}
