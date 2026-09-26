export const TEXTBOOK_IMPORT_COLUMNS=["unit_code","section_code","content_type","content_text","translation","knowledge_codes","ability_codes"];
export function parseDelimitedCodes(value){if(Array.isArray(value))return value;if(!value)return[];return String(value).split(/[;,，；]/).map(x=>x.trim()).filter(Boolean);}
export function fromExcelRow(row){return {unit_code:row.unit_code,section_code:row.section_code??null,content_type:row.content_type,content_text:row.content_text,translation:row.translation??null,knowledge_codes:parseDelimitedCodes(row.knowledge_codes),ability_codes:parseDelimitedCodes(row.ability_codes)};}
export function validateHeaders(headers){const missing=TEXTBOOK_IMPORT_COLUMNS.filter(x=>!headers.includes(x));return {valid:missing.length===0,missing};}
