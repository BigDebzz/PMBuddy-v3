import { supabase } from './supabase';
import { buildSuggestionPrompt, parseSuggestions } from './taskSuggestions';

// Asks PM Buddy for suggested tasks for a project. Returns [] when it cannot.
// `error` is set to a short reason a person can read.
export async function suggestTasks(project) {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session && session.session && session.session.access_token;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt: buildSuggestionPrompt(project), mode: 'document' }),
    });
    if (res.status === 429) return { tasks: [], error: 'You have reached the daily limit for AI suggestions. Please try again tomorrow.' };
    if (!res.ok) return { tasks: [], error: 'PM Buddy could not make suggestions just now. Please try again in a moment.' };
    const body = await res.json();
    const tasks = parseSuggestions(body.result, project);
    return tasks.length ? { tasks, error: '' } : { tasks: [], error: 'PM Buddy had no suggestions this time. Please try again.' };
  } catch (e) {
    return { tasks: [], error: 'PM Buddy could not make suggestions just now. Please check your connection and try again.' };
  }
}
