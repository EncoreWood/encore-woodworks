import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spreadsheetId, getAllSheets } = await req.json();
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");

        if (getAllSheets) {
            // Get spreadsheet metadata to list all sheets
            const metaResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!metaResponse.ok) {
                const error = await metaResponse.text();
                return Response.json({ error: `Failed to fetch metadata: ${error}` }, { status: metaResponse.status });
            }

            const metadata = await metaResponse.json();
            const sheets = metadata.sheets.map(sheet => sheet.properties.title);

            // Fetch data from all sheets
            const allData = {};
            for (const sheetName of sheets) {
                const dataResponse = await fetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (dataResponse.ok) {
                    const sheetData = await dataResponse.json();
                    allData[sheetName] = sheetData.values || [];
                }
            }

            return Response.json({ sheets: allData });
        }

        return Response.json({ error: 'Invalid request' }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});