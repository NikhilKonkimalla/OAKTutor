const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// OPENROUTER_API_KEY is stored as a Cloudflare Worker secret — never in source code.
// Set it via: wrangler secret put OPENROUTER_API_KEY
export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        const body = await request.text();

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://cahlr.github.io",
                "X-Title": "OAKTutor",
            },
            body,
        });

        const result = await response.text();

        return new Response(result, {
            status: response.status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    },
};
