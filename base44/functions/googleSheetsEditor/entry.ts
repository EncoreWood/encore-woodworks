import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, spreadsheetId, range, values } = body;

    // Get Google Sheets access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    if (!accessToken) {
      return Response.json(
        { error: 'Google Sheets not authorized. Please authorize first.' },
        { status: 403 }
      );
    }

    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

    if (action === 'read') {
      // Read data from sheet
      const response = await fetch(sheetsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return Response.json(data);
    }

    if (action === 'write') {
      // Write data to sheet
      const response = await fetch(sheetsUrl + '?valueInputOption=USER_ENTERED', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      });

      const data = await response.json();
      return Response.json(data);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});