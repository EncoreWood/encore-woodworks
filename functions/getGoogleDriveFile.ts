import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_id } = await req.json();

    if (!file_id) {
      return Response.json({ error: 'file_id is required' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // Get file metadata
    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?fields=name,mimeType`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!metadataResponse.ok) {
      return Response.json({ error: 'Failed to get file metadata' }, { status: 400 });
    }

    const metadata = await metadataResponse.json();

    // Download file content
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to download file' }, { status: 400 });
    }

    const fileBlob = await fileResponse.blob();
    const arrayBuffer = await fileBlob.arrayBuffer();
    const file = new File([arrayBuffer], metadata.name, { type: metadata.mimeType });

    // Upload to Base44 storage
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({
      file_url,
      file_name: metadata.name,
      file_type: metadata.name.split('.').pop()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});