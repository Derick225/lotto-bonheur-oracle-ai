import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha1Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    if (!password || typeof password !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: password" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Compute k-anonymity hash prefix
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const hibpResp = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        "Add-Padding": "true",
        "User-Agent": "lottery-oracle-security/1.0",
      },
    });

    if (!hibpResp.ok) {
      return new Response(
        JSON.stringify({ error: "HIBP service unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }

    const text = await hibpResp.text();
    let count = 0;
    for (const line of text.split("\n")) {
      const [lineSuffix, lineCount] = line.trim().split(":");
      if (lineSuffix && lineSuffix.toUpperCase() === suffix) {
        count = parseInt(lineCount, 10) || 0;
        break;
      }
    }

    return new Response(
      JSON.stringify({ pwned: count > 0, count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("password-breach-check error:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
