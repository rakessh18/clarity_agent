export default async function handler(req, res) {
    // Only allow POST requests for analysis and chat
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { body, action, url, headers: customHeaders } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: 'Anthropic API key is missing. Please set the ANTHROPIC_API_KEY environment variable on Vercel.'
        });
    }

    // New: Handle direct fetch requests for external APIs (like Microsoft Clarity)
    if (action === 'fetch' && url) {
        try {
            console.log("Proxy fetching URL:", url);
            const response = await fetch(url, {
                method: 'GET',
                headers: customHeaders || {},
            });
            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            console.error('Proxy Fetch Error:', error);
            return res.status(500).json({ error: 'Failed to fetch external URL', details: error.message });
        }
    }

    // Standard Anthropic Proxy Logic
    try {
        if (!body || !body.model) {
            throw new Error("Invalid request body. 'body.model' is required.");
        }
        
        console.log("Calling Anthropic with model:", body.model);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Anthropic API Error: ${data.error?.message || response.statusText || "Unknown Error"}`,
                details: data
            });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Proxy Catch Error:', error);
        res.status(500).json({ 
            error: 'Failed to communicate with Anthropic API',
            details: error.message 
        });
    }
}
