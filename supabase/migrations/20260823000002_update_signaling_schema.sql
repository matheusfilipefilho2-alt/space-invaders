-- Drop old table and recreate with separate candidate columns
DROP TABLE IF EXISTS pvp_signaling;

CREATE TABLE pvp_signaling (
  room_id TEXT PRIMARY KEY,
  offer JSONB,
  answer JSONB,
  ice_candidates_offerer JSONB DEFAULT '[]'::jsonb,
  ice_candidates_answerer JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE pvp_signaling ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON pvp_signaling FOR ALL USING (true);

-- Index for cleanup
CREATE INDEX idx_signaling_created ON pvp_signaling(created_at);
