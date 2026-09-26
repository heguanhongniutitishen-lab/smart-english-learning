export class CurriculumMappingService{
 constructor(repo){this.repo=repo;}
 async mapKnowledge(input,actor){if(!input.textbook_id||!input.knowledge_point_id)throw Object.assign(new Error("textbook_id and knowledge_point_id required"),{status:400,code:"CURRICULUM_MAPPING_INVALID"});return this.repo.mapKnowledge(input,actor);}
 async mapAbility(input,actor){if(!input.textbook_id||!input.ability_id)throw Object.assign(new Error("textbook_id and ability_id required"),{status:400,code:"CURRICULUM_MAPPING_INVALID"});return this.repo.mapAbility(input,actor);}
}
