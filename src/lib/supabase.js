import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vgesdjzubysocwmfdxed.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZXNkanp1Ynlzb2N3bWZkeGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTAwNjAsImV4cCI6MjA5MDU2NjA2MH0.5GMwkS9YLU9aCoM0RIO6OUROnx9r7Ql_JtYaIZ8fsqo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
