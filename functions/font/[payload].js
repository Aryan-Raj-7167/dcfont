const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function onRequestGet({ params }) {
    const raw = params.payload || "";
    const id = raw.replace(/\.json$/i, "");
    
    let json;
    try {
        json = decodeBase64Url(id);
        JSON.parse(json);
    } catch (err) {
        return jsonResponse({ error: "Invalid or corrupted font.json payload" }, 400);
    }
    
    return new Response(json, {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=31536000, immutable",
            ...CORS_HEADERS,
        },
    });
}

export async function onRequestOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}

function decodeBase64Url(b64url) {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function jsonResponse(obj, status) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
    });
}