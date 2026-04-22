import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  const jiraPath = Array.isArray(path) ? path.join('/') : path;
  const targetDomain = req.headers['x-jira-domain'] as string;

  if (!targetDomain) {
    return res.status(400).json({ error: 'Missing x-jira-domain header' });
  }

  // Determine the full URL
  // path will be everything after /api/jira/
  const url = `https://${targetDomain}/rest/api/3/${jiraPath || ''}`;

  // Prepare headers for forwarding
  const headers = new Headers();
  if (req.headers.authorization) {
    headers.set('Authorization', req.headers.authorization);
  }
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to proxy request to Jira' });
  }
}
