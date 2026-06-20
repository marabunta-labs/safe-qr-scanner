import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    // 1. Comprobamos si el texto del QR es una URL (enlace) o solo texto normal
    let isUrl = true;
    try {
      new URL(text);
    } catch {
      isUrl = false;
    }

    // Si es solo texto normal (ej. una vCard o un mensaje), no hay riesgo de malware web
    if (!isUrl) {
      return NextResponse.json({ 
        isUrl: false, 
        message: "Es un texto plano, no un enlace." 
      });
    }

    // 2. Si es una URL, la codificamos en base64url como exige la API de VirusTotal v3
    const encodedUrl = Buffer.from(text).toString("base64url");

    // 3. Hacemos la petición segura a VirusTotal
    const vtResponse = await fetch(`https://www.virustotal.com/api/v3/urls/${encodedUrl}`, {
      method: "GET",
      headers: {
        "x-apikey": process.env.VIRUSTOTAL_API_KEY || "",
      },
    });

    if (!vtResponse.ok) {
      // Si la URL no está en la base de datos de VT, devolverá un 404 (no analizada antes)
      if (vtResponse.status === 404) {
        return NextResponse.json({
          isUrl: true,
          status: "unknown",
          message: "Esta URL no ha sido analizada por VirusTotal aún."
        });
      }
      throw new Error("Error en la API de VirusTotal");
    }

    const data = await vtResponse.json();
    const stats = data.data.attributes.last_analysis_stats;

    // 4. Evaluamos los resultados
    const isMalicious = stats.malicious > 0 || stats.phishing > 0;

    return NextResponse.json({
      isUrl: true,
      status: isMalicious ? "danger" : "safe",
      stats: stats,
    });

  } catch (error) {
    console.error("Error comprobando URL:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}