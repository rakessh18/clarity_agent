export default async function handler(req, res) {
    // Only allow POST requests for analysis and chat
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: 'Anthropic API key is missing. Please set the ANTHROPIC_API_KEY environment variable on Vercel.'
        });
    }

    try {
        // Forward the request to Anthropic's API
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

        // Standard Vercel function response
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Failed to communicate with Anthropic API: ' + error.message });
    }
}
