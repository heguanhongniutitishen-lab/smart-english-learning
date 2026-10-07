export function normalizeQuestion(view){
 const content=view?.content||{},p=content.payload||{},a=content.answer_payload||{},e=content.explanation_payload||{};
 const common={contentVersion:content.content_version_id,prompt:p.stem||p.prompt||"",explain:e.text||e.explanation||"看清关键点，再判断一次。",repair:e.repair||e.text||"把刚才的关键点重新理解一遍。"};
 if(!common.prompt)return null;
 if(Array.isArray(p.options)&&p.options.length&&Number.isInteger(a.correct_index))return{...common,type:"single_choice",options:p.options,correctIndex:a.correct_index};
 const accepted=Array.isArray(a.accepted_answers)?a.accepted_answers:(typeof a.answer==="string"?[a.answer]:[]);
 if(accepted.length)return{...common,type:"text_input",acceptedAnswers:accepted.map(normalizeText),placeholder:p.placeholder||"输入答案"};
 return null;
}
export function evaluateAnswer(question,value){
 if(question.type==="single_choice")return Number(value)===question.correctIndex;
 if(question.type==="text_input")return question.acceptedAnswers.includes(normalizeText(value));
 return false;
}
export function attemptAnswerPayload(question,value){
 if(question.type==="single_choice")return{choice_index:Number(value)};
 if(question.type==="text_input")return{answer:String(value??"")};
 return{};
}
function normalizeText(v){return String(v??"").trim().toLocaleLowerCase("en-US").replace(/\s+/g," ");}
