/**
 * Converts plain text to Atlassian Document Format (ADF)
 * Required by Jira REST API v3
 */
export const toADF = (text: string) => {
  return {
    version: 1,
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: text || 'Uploaded via Jira Logwork'
          }
        ]
      }
    ]
  };
};
