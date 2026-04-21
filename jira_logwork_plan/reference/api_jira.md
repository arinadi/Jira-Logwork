# Jira REST API Reference (v3)

## Authentication

### 1. OAuth 2.0 (3LO)
- **Base URL**: `https://api.atlassian.com/ex/jira/{cloudid}/`
- **Scopes Required**: `write:jira-work`, `read:jira-work`
- **Exchange URL**: `https://auth.atlassian.com/oauth/token`
- **Gotchas**: Requires `client_secret`. Cloud ID must be fetched via `https://api.atlassian.com/oauth/token/accessible-resources`.

### 2. API Token (Basic Auth)
- **Base URL**: `https://{domain}.atlassian.net/`
- **[UPDATED] Credentials**: Requires **User Email** and **API Token**.
- **Header**: `Authorization: Basic Base64(email:token)`

## Endpoints

### Add Worklog
`POST /rest/api/3/issue/{issueIdOrKey}/worklog`

**Body Payload (ADF)**:
```json
{
  "comment": {
    "type": "doc",
    "version": 1,
    "content": [
      {
        "type": "paragraph",
        "content": [
          { "text": "Worklog comment", "type": "text" }
        ]
      }
    ]
  },
  "started": "2021-01-17T12:34:00.000+0000",
  "timeSpentSeconds": 3600
}
```

## Performance & Limits
- **Rate Limits**: Atlassian uses a cost-based rate limiting system. Recommended batch size: 10-20 concurrent requests with delays between batches.
- **CORS**: APIs do NOT allow cross-origin requests from browsers by default. Use a proxy or extension.
