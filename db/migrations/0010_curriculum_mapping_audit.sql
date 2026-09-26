BEGIN;
ALTER TABLE curriculum_knowledge_mappings ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(user_id);
ALTER TABLE curriculum_ability_mappings ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(user_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_knowledge_textbook ON curriculum_knowledge_mappings(textbook_id,unit_id,section_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_ability_textbook ON curriculum_ability_mappings(textbook_id,unit_id,section_id);
COMMIT;
