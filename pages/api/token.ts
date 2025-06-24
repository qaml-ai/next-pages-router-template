import type { NextApiRequest, NextApiResponse } from 'next';
import { CamelClient } from '../../components/camelClient';

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

  let uid = "0";

  // 🔐 Require auth to your own app (TODO: replace with real session lookup)
  // const session = (req as any).session;
  // if (!session?.user?.id) {
  //   uid = session?.user?.id;
  //   return res.status(401).json({ error: 'not authenticated' });
  // }

  const camelClient = new CamelClient(CAMELAI_API_KEY, baseUrl);
  const dataSources = await camelClient.listDataSources({ fetchAll: true });
  const sources = dataSources.map(ds => ds.id.toString());

  try {
    // 1️⃣  Exchange API key for short-lived token
    const tokenPayload: any = { srcs: sources, uid: uid };
    
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