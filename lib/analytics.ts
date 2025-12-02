import { v4 as uuidv4 } from 'uuid';
import { saveEventToSupabase, QuizEventDB } from './supabase';

export interface QuizEvent {
  id: string;
  sessionId: string;
  eventType: 'quiz_start' | 'step_view' | 'step_complete' | 'answer_selected' | 'quiz_complete' | 'quiz_abandon';
  step: number;
  stepName: string;
  answer?: string;
  answerIndex?: number;
  timestamp: number;
  timeSpentOnStep?: number;
  metadata?: Record<string, any>;
}

export interface QuizSession {
  sessionId: string;
  startTime: number;
  userAgent: string;
  referrer: string;
  screenWidth: number;
  screenHeight: number;
}

const STORAGE_KEY = 'quiz_analytics_events';
const SESSION_KEY = 'quiz_analytics_session';

class QuizAnalytics {
  private sessionId: string;
  private stepStartTime: number = 0;
  private currentStep: number = 0;

  constructor() {
    this.sessionId = this.getOrCreateSession();
  }

  private getOrCreateSession(): string {
    if (typeof window === 'undefined') return uuidv4();
    
    let session = sessionStorage.getItem(SESSION_KEY);
    if (!session) {
      session = uuidv4();
      sessionStorage.setItem(SESSION_KEY, session);
    }
    return session;
  }

  private getStepName(step: number): string {
    const stepNames: Record<number, string> = {
      0: 'Intro',
      1: 'Cuantos kilos perder',
      2: 'Clasificacion cuerpo',
      3: 'Zona reducir grasa',
      4: 'Nombre',
      5: 'Feliz con apariencia',
      6: 'Obstaculos perder peso',
      7: 'Como afecta peso vida',
      8: 'Beneficios deseados',
      9: 'Protocol Intro',
      10: 'Testimonials',
      11: 'Peso actual',
      12: 'Estatura',
      13: 'Peso objetivo',
      14: 'Ingesta agua',
      15: 'Loading',
      16: 'Result',
      17: 'Sales Page',
      18: 'Video Page'
    };
    return stepNames[step] || `Step ${step}`;
  }

  private async sendEvent(event: QuizEvent): Promise<void> {
    this.saveEventLocally(event);
    
    const dbEvent: QuizEventDB = {
      id: event.id,
      session_id: event.sessionId,
      event_type: event.eventType,
      step: event.step,
      step_name: event.stepName,
      answer: event.answer,
      answer_index: event.answerIndex,
      timestamp: event.timestamp,
      time_spent_on_step: event.timeSpentOnStep,
      metadata: event.metadata,
    };
    
    saveEventToSupabase(dbEvent).catch(err => {
      console.debug('Failed to save to Supabase, data stored locally:', err);
    });
  }

  private saveEventLocally(event: QuizEvent): void {
    if (typeof window === 'undefined') return;
    
    try {
      const events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      events.push(event);
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to save event locally:', error);
    }
  }

  trackQuizStart(): void {
    this.stepStartTime = Date.now();
    this.currentStep = 0;
    
    const event: QuizEvent = {
      id: uuidv4(),
      sessionId: this.sessionId,
      eventType: 'quiz_start',
      step: 0,
      stepName: 'Intro',
      timestamp: Date.now(),
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
        screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
        url: typeof window !== 'undefined' ? window.location.href : '',
      }
    };
    
    this.sendEvent(event);
  }

  trackStepView(step: number): void {
    const now = Date.now();
    const timeSpent = this.stepStartTime > 0 ? now - this.stepStartTime : 0;
    
    const event: QuizEvent = {
      id: uuidv4(),
      sessionId: this.sessionId,
      eventType: 'step_view',
      step,
      stepName: this.getStepName(step),
      timestamp: now,
      timeSpentOnStep: this.currentStep !== step ? timeSpent : undefined,
    };
    
    this.stepStartTime = now;
    this.currentStep = step;
    
    this.sendEvent(event);
  }

  trackAnswer(step: number, answer: string, answerIndex: number): void {
    const now = Date.now();
    const timeSpent = this.stepStartTime > 0 ? now - this.stepStartTime : 0;
    
    const event: QuizEvent = {
      id: uuidv4(),
      sessionId: this.sessionId,
      eventType: 'answer_selected',
      step,
      stepName: this.getStepName(step),
      answer,
      answerIndex,
      timestamp: now,
      timeSpentOnStep: timeSpent,
    };
    
    this.sendEvent(event);
  }

  trackSliderValue(step: number, value: number, unit: string): void {
    const now = Date.now();
    const timeSpent = this.stepStartTime > 0 ? now - this.stepStartTime : 0;
    
    const event: QuizEvent = {
      id: uuidv4(),
      sessionId: this.sessionId,
      eventType: 'answer_selected',
      step,
      stepName: this.getStepName(step),
      answer: `${value} ${unit}`,
      timestamp: now,
      timeSpentOnStep: timeSpent,
      metadata: { value, unit }
    };
    
    this.sendEvent(event);
  }

  trackStepComplete(step: number): void {
    const now = Date.now();
    const timeSpent = this.stepStartTime > 0 ? now - this.stepStartTime : 0;
    
    const event: QuizEvent = {
      id: uuidv4(),
      sessionId: this.sessionId,
      eventType: 'step_complete',
      step,
      stepName: this.getStepName(step),
      timestamp: now,
      timeSpentOnStep: timeSpent,
    };
    
    this.sendEvent(event);
  }

  trackQuizComplete(finalData?: Record<string, any>): void {
    const event: QuizEvent = {
      id: uuidv4(),
      sessionId: this.sessionId,
      eventType: 'quiz_complete',
      step: 18,
      stepName: 'Quiz Complete',
      timestamp: Date.now(),
      metadata: finalData,
    };
    
    this.sendEvent(event);
  }

  trackAbandon(lastStep: number): void {
    const now = Date.now();
    const timeSpent = this.stepStartTime > 0 ? now - this.stepStartTime : 0;
    
    const event: QuizEvent = {
      id: uuidv4(),
      sessionId: this.sessionId,
      eventType: 'quiz_abandon',
      step: lastStep,
      stepName: this.getStepName(lastStep),
      timestamp: now,
      timeSpentOnStep: timeSpent,
    };
    
    this.sendEvent(event);
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

export const analytics = new QuizAnalytics();
export default analytics;
