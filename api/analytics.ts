import type { VercelRequest, VercelResponse } from '@vercel/node';

interface QuizEvent {
  id: string;
  sessionId: string;
  eventType: string;
  step: number;
  stepName: string;
  answer?: string;
  answerIndex?: number;
  timestamp: number;
  timeSpentOnStep?: number;
  metadata?: Record<string, any>;
}

const events: QuizEvent[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const event = req.body as QuizEvent;
      
      if (!event.id || !event.sessionId || !event.eventType) {
        return res.status(400).json({ error: 'Invalid event data' });
      }

      events.push(event);

      if (events.length > 10000) {
        events.splice(0, events.length - 10000);
      }

      return res.status(200).json({ success: true, eventId: event.id });
    } catch (error) {
      console.error('Error processing event:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'GET') {
    const { password, startDate, endDate } = req.query;

    const dashboardPassword = process.env.DASHBOARD_PASSWORD || 'admin123';
    if (password !== dashboardPassword) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let filteredEvents = [...events];

    if (startDate && typeof startDate === 'string') {
      const start = new Date(startDate).getTime();
      filteredEvents = filteredEvents.filter(e => e.timestamp >= start);
    }

    if (endDate && typeof endDate === 'string') {
      const end = new Date(endDate).getTime();
      filteredEvents = filteredEvents.filter(e => e.timestamp <= end);
    }

    return res.status(200).json({
      events: filteredEvents,
      totalEvents: filteredEvents.length,
      timestamp: Date.now()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
