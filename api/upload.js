import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileBase64, mimeType, fileName } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing fileBase64 or mimeType' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Decode base64 to buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // Build multipart/related body per Google File API spec
    const boundary = 'PMBuddyBoundary' + Date.now();
    const metadata = JSON.stringify({
      file: {
        display_name: fileName || 'uploaded_document',
        mime_type: mimeType,
      }
    });

    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'multipart',
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error('Google File API upload failed:', uploadRes.status, errorText);
      return res.status(uploadRes.status).json({
        error: 'File upload to Google failed',
        details: errorText,
      });
    }

    const uploadData = await uploadRes.json();
    const fileUri = uploadData.file?.uri;
    const returnedMimeType = uploadData.file?.mimeType || mimeType;

    if (!fileUri) {
      return res.status(500).json({ error: 'No file URI returned from Google' });
    }

    return res.status(200).json({
      fileUri,
      mimeType: returnedMimeType,
      fileName: fileName || 'uploaded_document',
    });

  } catch (err) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
