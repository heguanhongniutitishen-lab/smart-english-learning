/**
 * Persistence ports. Domain/API code depends on these contracts, not PostgreSQL details.
 * PostgreSQL implementations must preserve append-only history and transaction boundaries.
 */
export class StudentRepository{
 async createStudent(){throw new Error("not implemented");}
 async owns(){throw new Error("not implemented");}
 async appendConfig(){throw new Error("not implemented");}
 async appendAcademicHistory(){throw new Error("not implemented");}
 async replaceCurrentCurriculumPosition(){throw new Error("not implemented");}
}
export class CurriculumRepository{
 async listTextbooks(){throw new Error("not implemented");}
 async getTextbookStructure(){throw new Error("not implemented");}
}
