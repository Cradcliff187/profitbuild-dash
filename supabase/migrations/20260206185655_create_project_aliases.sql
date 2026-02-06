CREATE TABLE project_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  match_type TEXT CHECK (match_type IN ('exact', 'starts_with', 'contains')) DEFAULT 'exact',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(alias, match_type)
);

ALTER TABLE project_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read project aliases" ON project_aliases FOR SELECT USING (true);
CREATE POLICY "Users can manage project aliases" ON project_aliases FOR ALL USING (auth.uid() IS NOT NULL);

INSERT INTO project_aliases (project_id, alias, match_type) VALUES
  ((SELECT id FROM projects WHERE project_number = '001-GAS'), 'fuel', 'starts_with'),
  ((SELECT id FROM projects WHERE project_number = '002-GA'), 'ga', 'exact');
