import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path, ...restQuery } = req.query;
  const jiraPath = Array.isArray(path) ? path.join('/') : path;
  const targetDomain = req.headers['x-jira-domain'] as string;

  if (!targetDomain) {
    return res.status(400).json({ error: 'Missing x-jira-domain header' });
  }

  // Path will be everything after /api/jira/ (e.g. rest/api/3/myself)
  let url = `https://${targetDomain}/${jiraPath || ''}`;

  // Forward any additional query parameters (like jql, startAt, maxResults)
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(restQuery)) {
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, String(v)));
    } else if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }
  
  const queryString = searchParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  // Prepare headers for forwarding
  const headers = new Headers();
  if (req.headers.authorization) {
    headers.set('Authorization', req.headers.authorization);
  }
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ 
      error: 'Failed to proxy request to Jira',
      details: error instanceof Error ? error.message : String(error),
      url: url
    });
  }
}
