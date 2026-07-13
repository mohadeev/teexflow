export interface Script {
  id: string;
  user_id: string;
  title: string;
  sections: Array<{ id: string; title: string; content: string }>;
  created_at: string;
  updated_at?: string;
}