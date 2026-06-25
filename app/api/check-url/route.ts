import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    let isUrl = true;
    try {
      new URL(text);
    } catch {
      isUrl = false;
    }

    if (!isUrl) {
      return NextResponse.json({ 
        isUrl: false, 
        message: "Is not a valid URL" 
      });
    }

    const encodedUrl = Buffer.from(text).toString("base64url");

    const vtResponse = await fetch(`https://www.virustotal.com/api/v3/urls/${encodedUrl}`, {
      method: "GET",
      headers: {
        "x-apikey": process.env.VIRUSTOTAL_API_KEY || "",
      },
    });

    if (!vtResponse.ok) {
      if (vtResponse.status === 404) {
        return NextResponse.json({
          isUrl: true,
          status: "unknown",
          message: "This URL has not been analyzed by VirusTotal yet."
        });
      }
      throw new Error("Error in the VirusTotal API");
    }

    const data = await vtResponse.json();
    const stats = data.data.attributes.last_analysis_stats;

    const isMalicious = stats.malicious > 0 || stats.phishing > 0;

    return NextResponse.json({
      isUrl: true,
      status: isMalicious ? "danger" : "safe",
      stats: stats,
    });

  } catch (error) {
    console.error("Error checking URL:", error);
    return NextResponse.json(
      { error: "Error processing the request" },
      { status: 500 }
    );
  }
}