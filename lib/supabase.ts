import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://swnwftcfvlmdviknfdou.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bndmdGNmdmxtZHZpa25mZG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0Nzc1OTksImV4cCI6MjA4MDA1MzU5OX0.g3-JIdQ8N4GJZZHIZyFf9dt_yMtqMIYR2uun_ZUekqk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface QuizEventDB {
  id: string;
  session_id: string;
  event_type: string;
  step: number;
  step_name: string;
  answer?: string;
  answer_index?: number;
  timestamp: number;
  time_spent_on_step?: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

export async function saveEventToSupabase(event: QuizEventDB): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('quiz_events')
      .insert([event]);
    
    if (error) {
      console.warn('Failed to save event to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Supabase connection error:', error);
    return false;
  }
}

export async function getEventsFromSupabase(startDate?: Date, endDate?: Date): Promise<QuizEventDB[]> {
  try {
    let query = supabase
      .from('quiz_events')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (startDate) {
      query = query.gte('timestamp', startDate.getTime());
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate.getTime());
    }
    
    const { data, error } = await query.limit(10000);
    
    if (error) {
      console.warn('Failed to fetch events from Supabase:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.warn('Supabase connection error:', error);
    return [];
  }
}

export function convertToQuizEvent(dbEvent: QuizEventDB) {
  return {
    id: dbEvent.id,
    sessionId: dbEvent.session_id,
    eventType: dbEvent.event_type as any,
    step: typeof dbEvent.step === 'string' ? parseInt(dbEvent.step, 10) : dbEvent.step,
    stepName: dbEvent.step_name,
    answer: dbEvent.answer,
    answerIndex: dbEvent.answer_index != null ? (typeof dbEvent.answer_index === 'string' ? parseInt(dbEvent.answer_index, 10) : dbEvent.answer_index) : undefined,
    timestamp: typeof dbEvent.timestamp === 'string' ? parseInt(dbEvent.timestamp, 10) : dbEvent.timestamp,
    timeSpentOnStep: dbEvent.time_spent_on_step != null ? (typeof dbEvent.time_spent_on_step === 'string' ? parseInt(dbEvent.time_spent_on_step, 10) : dbEvent.time_spent_on_step) : undefined,
    metadata: dbEvent.metadata,
  };
}
