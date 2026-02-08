import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spreadsheetId = '1W8Kj5DNzyX1ZvCWTFwX3H5ZsxeHQOJ0izAU86ii5ep8';
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch just the values
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const data = await response.json();
    return Response.json({ values: data.values });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});