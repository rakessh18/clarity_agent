export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body || {};
        const { body: anthropicBody, action, url, headers: customHeaders } = payload;
        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API Key missing on Vercel environment variables.' });
        }

        // Handle Clarity Data Fetch
        if (action === 'fetch' && url) {
            const fetchRes = await fetch(url, { headers: customHeaders || {} });
            const contentType = fetchRes.headers.get("content-type");
            
            if (contentType && contentType.includes("application/json")) {
                const fetchData = await fetchRes.json();
                return res.status(fetchRes.status).json(fetchData);
            } else {
                const textData = await fetchRes.text();
                return res.status(fetchRes.status).json({ 
                    error: `Clarity API returned non-JSON response (Status ${fetchRes.status})`,
                    details: textData.slice(0, 500)
                });
            }
        }

        // Handle Anthropic Analysis
        const finalBody = anthropicBody || payload.body || payload;
        if (!finalBody || !finalBody.model) {
            return res.status(400).json({ error: 'Invalid request: No model specified', received: payload });
        }

        console.log("Proxying to Anthropic...");
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(finalBody),
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({
                error: `Anthropic rejected request: ${data.error?.message || response.statusText}`,
                details: data
            });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('SERVER PROXY ERROR:', error);
        return res.status(500).json({ 
            error: 'Internal Proxy Error',
            message: error.message,
            stack: error.stack
        });
    }
}
