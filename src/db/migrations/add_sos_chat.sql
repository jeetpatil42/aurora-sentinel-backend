-- Create SOS chat tables

CREATE TABLE IF NOT EXISTS sos_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sos_id UUID NOT NULL UNIQUE REFERENCES sos_events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  security_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sos_chats_sos_id ON sos_chats(sos_id);
CREATE INDEX IF NOT EXISTS idx_sos_chats_student_id ON sos_chats(student_id);
CREATE INDEX IF NOT EXISTS idx_sos_chats_security_id ON sos_chats(security_id);

CREATE TABLE IF NOT EXISTS sos_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES sos_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sos_chat_messages_chat_id_created_at
  ON sos_chat_messages(chat_id, created_at ASC);

-- Keep updated_at fresh for sos_chats
DROP TRIGGER IF EXISTS update_sos_chats_updated_at ON sos_chats;
CREATE TRIGGER update_sos_chats_updated_at BEFORE UPDATE ON sos_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
