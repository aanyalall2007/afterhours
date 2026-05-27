// Vercel serverless function — receives form submissions, writes to Notion
// Token lives here on the server, never exposed to the browser.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { email, code, queueNum } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const notionRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${process.env.NOTION_TOKEN}`,
      'Content-Type':   'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        'Email':       { title:     [{ text: { content: email } }] },
        'Status':      { select:    { name: 'Waitlisted' } },
        'Invite Code': { rich_text: [{ text: { content: code || '' } }] },
        'School':      { rich_text: [{ text: { content: 'USC' } }] },
        'Queue #':     { number: queueNum || 0 },
      },
    }),
  }).catch(err => { console.error(err); return null; });

  if (!notionRes || !notionRes.ok) {
    const body = notionRes ? await notionRes.text() : 'fetch failed';
    console.error('Notion error:', body);
    return res.status(500).json({ error: 'Notion sync failed' });
  }

  return res.status(200).json({ ok: true });
};
