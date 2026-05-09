import {
  listEvents,
  searchEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  resolveEvent,
} from '../services/event.service.js';
import { createEventSource } from '../services/source.service.js';

export async function getEvents(req, res) {
  const filters = {
    date: req.query.date,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    category: req.query.category,
    severity: req.query.severity,
    status: req.query.status,
    viewport: req.query.viewport,
  };

  const { events, count, hasMore } = await listEvents(filters);
  res.apiSuccess({
    events,
    count,
    hasMore,
    date: filters.date || filters.dateFrom || new Date().toISOString().slice(0, 10),
  });
}

export async function searchEventsController(req, res) {
  const filters = {
    q: req.query.q,
    date: req.query.date,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    category: req.query.category,
    severity: req.query.severity,
    status: req.query.status,
    viewport: req.query.viewport,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined,
  };

  const { events, count, limit, offset, hasMore } = await searchEvents(filters);
  res.apiSuccess({
    events,
    count,
    limit,
    offset,
    hasMore,
    query: filters.q,
  });
}

export async function getEvent(req, res) {
  const result = await getEventById(req.params.id);
  if (!result) {
    return res.apiError('Event not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess(result);
}

export async function createEventController(req, res) {
  const { sources, ...eventData } = req.body;
  const event = await createEvent(eventData, req.user.id);

  // Create sources if provided
  if (Array.isArray(sources) && sources.length > 0) {
    for (const src of sources) {
      await createEventSource(
        event.id,
        {
          sourceType: src.sourceType,
          sourceUrl: src.sourceUrl,
          description: src.description,
          displayOrder: src.displayOrder,
        },
        req.user.id
      );
    }
  }

  res.apiSuccess({ event }, 'Event created successfully');
}

export async function updateEventController(req, res) {
  const event = await updateEvent(req.params.id, req.body);
  if (!event) {
    return res.apiError('Event not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ event }, 'Event updated successfully');
}

export async function deleteEventController(req, res) {
  const result = await deleteEvent(req.params.id);
  if (!result) {
    return res.apiError('Event not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ deleted: true });
}

export async function resolveEventController(req, res) {
  const { resolvedAt } = req.body;
  const event = await resolveEvent(req.params.id, req.user.id, resolvedAt);
  if (!event) {
    return res.apiError('Event not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ event });
}
