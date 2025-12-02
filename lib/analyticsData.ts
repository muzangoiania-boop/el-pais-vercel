import { QuizEvent } from './analytics';

const STORAGE_KEY = 'quiz_analytics_events';
const API_EVENTS_KEY = 'quiz_api_events';

export interface StepStats {
  step: number;
  stepName: string;
  views: number;
  completions: number;
  abandonments: number;
  abandonRate: number;
  avgTimeSpent: number;
  answers: Record<string, number>;
}

export interface FunnelStep {
  step: number;
  stepName: string;
  users: number;
  dropoff: number;
  dropoffRate: number;
}

export interface DashboardData {
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  completionRate: number;
  avgCompletionTime: number;
  stepStats: StepStats[];
  funnel: FunnelStep[];
  answerDistribution: Record<number, Record<string, number>>;
  timeSeriesData: { date: string; sessions: number; completions: number }[];
  recentEvents: QuizEvent[];
}

export function getLocalEvents(): QuizEvent[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const localEvents = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const apiEvents = JSON.parse(localStorage.getItem(API_EVENTS_KEY) || '[]');
    return [...localEvents, ...apiEvents];
  } catch {
    return [];
  }
}

export function saveApiEvents(events: QuizEvent[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(API_EVENTS_KEY, JSON.stringify(events));
  } catch (error) {
    console.warn('Failed to save API events:', error);
  }
}

export function calculateDashboardData(events: QuizEvent[], dateFilter?: { start: Date; end: Date }): DashboardData {
  let filteredEvents = events;
  
  if (dateFilter) {
    filteredEvents = events.filter(e => {
      const eventDate = new Date(e.timestamp);
      return eventDate >= dateFilter.start && eventDate <= dateFilter.end;
    });
  }

  const sessionGroups = new Map<string, QuizEvent[]>();
  filteredEvents.forEach(event => {
    const existing = sessionGroups.get(event.sessionId) || [];
    existing.push(event);
    sessionGroups.set(event.sessionId, existing);
  });

  const totalSessions = sessionGroups.size;
  let completedSessions = 0;
  let abandonedSessions = 0;
  let totalCompletionTime = 0;

  sessionGroups.forEach(sessionEvents => {
    const hasComplete = sessionEvents.some(e => e.eventType === 'quiz_complete');
    const hasAbandon = sessionEvents.some(e => e.eventType === 'quiz_abandon');
    
    if (hasComplete) {
      completedSessions++;
      const startEvent = sessionEvents.find(e => e.eventType === 'quiz_start');
      const completeEvent = sessionEvents.find(e => e.eventType === 'quiz_complete');
      if (startEvent && completeEvent) {
        totalCompletionTime += (completeEvent.timestamp - startEvent.timestamp) / 1000;
      }
    } else if (hasAbandon || sessionEvents.length > 0) {
      const maxStep = Math.max(...sessionEvents.map(e => e.step));
      if (maxStep < 18) {
        abandonedSessions++;
      }
    }
  });

  const stepStatsMap = new Map<number, StepStats>();
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

  for (let i = 0; i <= 18; i++) {
    stepStatsMap.set(i, {
      step: i,
      stepName: stepNames[i] || `Step ${i}`,
      views: 0,
      completions: 0,
      abandonments: 0,
      abandonRate: 0,
      avgTimeSpent: 0,
      answers: {}
    });
  }

  const stepTimes: Record<number, number[]> = {};
  
  filteredEvents.forEach(event => {
    const stats = stepStatsMap.get(event.step);
    if (!stats) return;

    if (event.eventType === 'step_view' || event.eventType === 'quiz_start') {
      stats.views++;
    }
    
    if (event.eventType === 'step_complete') {
      stats.completions++;
    }
    
    if (event.eventType === 'quiz_abandon') {
      stats.abandonments++;
    }
    
    if (event.eventType === 'answer_selected' && event.answer) {
      stats.answers[event.answer] = (stats.answers[event.answer] || 0) + 1;
    }
    
    if (event.timeSpentOnStep && event.timeSpentOnStep > 0) {
      if (!stepTimes[event.step]) stepTimes[event.step] = [];
      stepTimes[event.step].push(event.timeSpentOnStep);
    }
  });

  stepStatsMap.forEach((stats, step) => {
    if (stats.views > 0) {
      stats.abandonRate = (stats.abandonments / stats.views) * 100;
    }
    if (stepTimes[step] && stepTimes[step].length > 0) {
      stats.avgTimeSpent = stepTimes[step].reduce((a, b) => a + b, 0) / stepTimes[step].length / 1000;
    }
  });

  const funnel: FunnelStep[] = [];
  let previousUsers = totalSessions;
  
  for (let i = 0; i <= 18; i++) {
    const stats = stepStatsMap.get(i)!;
    const users = stats.views || (i === 0 ? totalSessions : 0);
    const dropoff = i === 0 ? 0 : previousUsers - users;
    const dropoffRate = i === 0 ? 0 : (previousUsers > 0 ? (dropoff / previousUsers) * 100 : 0);
    
    funnel.push({
      step: i,
      stepName: stats.stepName,
      users,
      dropoff: Math.max(0, dropoff),
      dropoffRate: Math.max(0, dropoffRate)
    });
    
    previousUsers = users;
  }

  const answerDistribution: Record<number, Record<string, number>> = {};
  stepStatsMap.forEach((stats, step) => {
    if (Object.keys(stats.answers).length > 0) {
      answerDistribution[step] = stats.answers;
    }
  });

  const dateGroups = new Map<string, { sessions: Set<string>; completions: number }>();
  filteredEvents.forEach(event => {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    if (!dateGroups.has(date)) {
      dateGroups.set(date, { sessions: new Set(), completions: 0 });
    }
    const group = dateGroups.get(date)!;
    group.sessions.add(event.sessionId);
    if (event.eventType === 'quiz_complete') {
      group.completions++;
    }
  });

  const timeSeriesData = Array.from(dateGroups.entries())
    .map(([date, data]) => ({
      date,
      sessions: data.sessions.size,
      completions: data.completions
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const recentEvents = [...filteredEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  return {
    totalSessions,
    completedSessions,
    abandonedSessions,
    completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
    avgCompletionTime: completedSessions > 0 ? totalCompletionTime / completedSessions : 0,
    stepStats: Array.from(stepStatsMap.values()),
    funnel,
    answerDistribution,
    timeSeriesData,
    recentEvents
  };
}
