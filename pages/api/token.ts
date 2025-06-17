import type { NextApiRequest, NextApiResponse } from 'next';

const CAMELAI_API_KEY = process.env.CAMEL_API_KEY;
const CAMELAI_STS_URL = 'https://api.camelai.com/api/v1/token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // 🔐 Require auth to your own app (TODO: replace with real session lookup)
  // const session = (req as any).session;
  // if (!session?.user?.id) {
  //   return res.status(401).json({ error: 'not authenticated' });
  // }

  try {
    // 1️⃣  Exchange API key for short-lived token
    const stsResp = await fetch(CAMELAI_STS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CAMELAI_API_KEY}`
      },
      body: JSON.stringify({ sub: "1", src: "1" }), // optional extra claims
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