export function normalizeQuestion(view){
 const content=view?.content||{},p=content.payload||{};
 const common={contentVersion:content.content_version_id,prompt:p.stem||p.prompt||"",explain:"提交后会根据结果给你反馈。",repair:"把刚才的关键点重新理解一遍。"};
 if(!common.prompt)return null;
 if(Array.isArray(p.options)&&p.options.length)return{...common,type:"single_choice",options:p.options};
 if(p.input_type==="text"||p.response_type==="text"||p.placeholder)return{...common,type:"text_input",placeholder:p.placeholder||"输入答案"};
 return null;
}
export function evaluateAnswer(){return false}
export function attemptAnswerPayload(question,value){
 if(question.type==="single_choice")return{choice_index:Number(value)};
 if(question.type==="text_input")return{answer:String(value??"")};
 return{};
}
