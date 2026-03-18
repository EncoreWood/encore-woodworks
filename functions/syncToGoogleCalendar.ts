import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data, eventId } = await req.json();
    
    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    let event;
    let calendarId = 'primary';

    if (type === 'project') {
      event = {
        summary: `📦 ${data.project_name}`,
        description: `Client: ${data.client_name}\nStatus: ${data.status}\n\n${data.notes || ''}`,
        start: {
          date: data.start_date
        },
        end: {
          date: data.estimated_completion || data.start_date
        },
        location: data.address || '',
        colorId: '5' // Yellow for projects
      };
    } else if (type === 'designMeeting') {
      event = {
        summary: `🎨 Design Meeting: ${data.client_name}`,
        description: `Project: ${data.project_name || 'N/A'}\n\n${data.notes || ''}`,
        start: {
          date: data.date
        },
        end: {
          date: data.date
        },
        colorId: '9' // Purple for design meetings
      };
    } else if (type === 'presenter') {
      event = {
        summary: `☕ Morning Meeting - Presenter: ${data.presenter_name}`,
        start: {
          date: data.date
        },
        end: {
          date: data.date
        },
        colorId: '7' // Blue for presenters
      };
    } else if (type === 'task') {
      event = {
        summary: `✓ ${data.task}`,
        description: data.assignee ? `Assigned to: ${data.assignee}` : '',
        start: {
          date: data.date
        },
        end: {
          date: data.date
        },
        colorId: '10' // Green for tasks
      };
    }

    let response;
    if (eventId) {
      // Update existing event
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        }
      );
    } else {
      // Create new event
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        }
      );
    }

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `Google Calendar API error: ${error}` }, { status: response.status });
    }

    const result = await response.json();
    return Response.json({ 
      success: true, 
      eventId: result.id,
      eventLink: result.htmlLink 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});