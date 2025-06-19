import type { NextApiRequest, NextApiResponse } from 'next';

const CAMELAI_API_KEY = process.env.CAMEL_API_KEY;

const baseUrl = process.env.CAMEL_API_URL || 'https://api.camelai.com';
const CAMELAI_STS_URL = `${baseUrl}/api/v1/token`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Check if API key is configured
  if (!CAMELAI_API_KEY) {
    return res.status(500).json({ 
      error: 'API key not configured',
      message: 'The server is missing the CAMEL_API_KEY environment variable. Please contact the administrator.'
    });
  }

  // 🔐 Require auth to your own app (TODO: replace with real session lookup)
  // const session = (req as any).session;
  // if (!session?.user?.id) {
  //   return res.status(401).json({ error: 'not authenticated' });
  // }

  // Extract source_id and optional thread_id from request body
  const { source_id, thread_id } = req.body;
  
  if (!source_id) {
    return res.status(400).json({ error: 'source_id is required' });
  }

  try {
    // 1️⃣  Exchange API key for short-lived token
    console.log("source_id", source_id)
    const tokenPayload: any = { sub: "1", src: source_id };
    
    // Add thread_id if provided
    if (thread_id) {
      tokenPayload.thread_id = thread_id;
    }
    
    const stsResp = await fetch(CAMELAI_STS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CAMELAI_API_KEY}`
      },
      body: JSON.stringify(tokenPayload),
    });

    if (!stsResp.ok) {
      console.error('STS error', await stsResp.text());
      return res.status(502).json({ error: 'token service failed' });
    }

    const { access_token } = await stsResp.json();

    // 2️⃣  Return token to the browser
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(access_token);
  } catch (err) {
    console.error('Token endpoint failed', err);
    return res.status(500).json({ error: 'unexpected error' });
  }
}