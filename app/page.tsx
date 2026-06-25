"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import QrScanner from "qr-scanner";

const translations = {
  es: {
    title: "Safe QR Scanner",
    subtitle: "Analiza cualquier código QR y descubre si esconde malware o phishing.",
    drag: "Haz clic aquí o arrastra una imagen",
    paste: "o presiona",
    pasteKeys: "Ctrl + V",
    pasteAction: "para pegar",
    or: "o también",
    btnCameraOn: "Activar Cámara",
    btnCameraOff: "Detener Cámara",
    footerAlert: "Protegiendo tus escaneos",
    termsTitle: "Transparencia y Privacidad",
    termsText1: "🔒 Local: Las imágenes se procesan en tu dispositivo. No subimos tus fotos a ningún servidor.",
    termsText2: "🛡️ Análisis: Solo las URLs extraídas se envían a VirusTotal para comprobar su seguridad.",
    errorCamera: "No se pudo acceder a la cámara.",
    errorNoQR: "No se detectó ningún código QR.",
    analyzing: "Analizando seguridad en VirusTotal...",
    scanAnother: "Escanear otro",
    safeTitle: "✅ Enlace Seguro",
    dangerTitle: "⚠️ ¡Peligro Detectado!",
    textTitle: "📝 Texto Plano (Sin riesgo)",
    unknownTitle: "❓ Enlace Desconocido",
    safeDesc: "VirusTotal no ha detectado amenazas.",
    dangerDesc: "motores de seguridad marcan este enlace como malicioso. ¡No lo abras!",
    unknownDesc: "No hay datos en VirusTotal sobre este enlace. Procede con precaución.",
    openSafeLink: "Acceder al enlace",
    openDangerLink: "Abrir enlace de todos modos",
    historyTitle: "Escaneos Recientes",
    clearHistory: "Borrar todo",
    noHistory: "No hay escaneos recientes",
    historyNoQR: "Imagen sin código QR",
    wifiTitle: "📶 Red WiFi",
    vcardTitle: "👤 Contacto (vCard)",
    emailTitle: "✉️ Correo Electrónico",
    phoneTitle: "📞 Teléfono",
    cryptoTitle: "💰 Billetera Cripto",
    copyBtn: "Copiar",
    copiedBtn: "¡Copiado!",
  },
  en: {
    title: "Safe QR Scanner",
    subtitle: "Scan any QR code and find out if it hides malware or phishing.",
    drag: "Click here or drag an image",
    paste: "or press",
    pasteKeys: "Ctrl + V",
    pasteAction: "to paste",
    or: "or else",
    btnCameraOn: "Activate Camera",
    btnCameraOff: "Stop Camera",
    footerAlert: "Protecting your scans",
    termsTitle: "Transparency & Privacy",
    termsText1: "🔒 Local: Images are processed on your device. We never upload your photos.",
    termsText2: "🛡️ Analysis: Only extracted URLs are sent to VirusTotal for security checks.",
    errorCamera: "Could not access the camera.",
    errorNoQR: "No QR code detected.",
    analyzing: "Analyzing security with VirusTotal...",
    scanAnother: "Scan another",
    safeTitle: "✅ Safe Link",
    dangerTitle: "⚠️ Danger Detected!",
    textTitle: "📝 Plain Text (No risk)",
    unknownTitle: "❓ Unknown Link",
    safeDesc: "VirusTotal did not detect any threats.",
    dangerDesc: "security vendors flagged this link as malicious. Do not open it!",
    unknownDesc: "No data available on VirusTotal for this link. Proceed with caution.",
    openSafeLink: "Access link",
    openDangerLink: "Open link anyway",
    historyTitle: "Recent Scans",
    clearHistory: "Clear all",
    noHistory: "No recent scans",
    historyNoQR: "No QR code found",
    wifiTitle: "📶 WiFi Network",
    vcardTitle: "👤 Contact (vCard)",
    emailTitle: "✉️ Email",
    phoneTitle: "📞 Phone Number",
    cryptoTitle: "💰 Crypto Wallet",
    copyBtn: "Copy",
    copiedBtn: "Copied!",
  }
};

type Lang = "es" | "en";
type Theme = "light" | "dark";

interface HistoryItem {
  id: string;
  text: string;
  status: "safe" | "danger" | "warning" | "text" | "error";
  timestamp: string;
  thumbnail?: string;
}

const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return; 
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime); 
    gain.gain.setValueAtTime(0.1, ctx.currentTime); 
    osc.start();
    osc.stop(ctx.currentTime + 0.15); 
  } catch (e) {}
};

const generateSafeId = () => {
  return (typeof crypto !== "undefined" && crypto.randomUUID) 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);
};

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [lang, setLang] = useState<Lang>("es");
  const [theme, setTheme] = useState<Theme>("light");
  
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  const [qrResult, setQrResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  useEffect(() => {
    const savedHistory = localStorage.getItem("safe_qr_history");
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedTheme = localStorage.getItem("theme") as Theme;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    try {
      scannerRef.current = new Html5Qrcode("reader");
    } catch (error) {
      console.warn("Camera not supported.", error);
    }
    
    return () => {
      try {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current?.clear();
      } catch (e) {}
    };
  }, []);

  const generateMicroThumbnail = (source: File | HTMLVideoElement): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 50;
      canvas.height = 50;
      const ctx = canvas.getContext("2d");

      if (source instanceof File) {
        const img = new Image();
        img.src = URL.createObjectURL(source);
        img.onload = () => {
          ctx?.drawImage(img, 0, 0, 50, 50);
          URL.revokeObjectURL(img.src);
          resolve(canvas.toDataURL("image/jpeg", 0.3));
        };
        img.onerror = () => resolve("");
      } else {
        try {
          ctx?.drawImage(source, 0, 0, 50, 50);
          resolve(canvas.toDataURL("image/jpeg", 0.3));
        } catch (e) {
          resolve("");
        }
      }
    });
  };

  const addToHistory = (text: string, status: HistoryItem["status"], thumbnail?: string) => {
    const newItem: HistoryItem = {
      id: generateSafeId(),
      text,
      status,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      thumbnail
    };

    setHistory(prevHistory => {
      const updatedHistory = [newItem, ...prevHistory].slice(0, 10);
      localStorage.setItem("safe_qr_history", JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const clearHistory = () => {
    localStorage.removeItem("safe_qr_history");
    setHistory([]);
  };

  const triggerSuccessEffects = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(100); 
    }
    playBeep(); 
  };

 const analyzeQrText = async (text: string, thumbnail?: string) => {
    triggerSuccessEffects();
    
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    const cleanUrlOrText = urlMatch ? urlMatch[0] : text;

    setQrResult(cleanUrlOrText); 
    setIsScanning(false);
    setIsTorchOn(false);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    if (!urlMatch) {
      setAnalysisResult({ isUrl: false, status: "safe" });
      addToHistory(cleanUrlOrText, "text", thumbnail);
      setIsAnalyzing(false);
      return;
    }

    try {
      const res = await fetch("/api/check-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanUrlOrText }),
      });
      const data = await res.json();
      setAnalysisResult(data);

      let status: HistoryItem["status"] = "text";
      if (data.isUrl) {
        if (data.status === "safe") status = "safe";
        else if (data.status === "danger") status = "danger";
        else status = "warning";
      }
      
      addToHistory(cleanUrlOrText, status, thumbnail);

    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileScan = async (file: File) => {
    let thumbnail = "";
    try {
      thumbnail = await generateMicroThumbnail(file);
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      analyzeQrText(result.data, thumbnail);
    } catch (err) {
      addToHistory(t.historyNoQR, "error", thumbnail);
      alert(t.errorNoQR);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileScan(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) handleFileScan(file);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [lang]);

  useEffect(() => {
    if (isScanning && scannerRef.current) {
      setQrResult(null);
      setAnalysisResult(null);
      scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          const videoElement = document.querySelector("#reader video") as HTMLVideoElement;
          const thumbnail = videoElement ? await generateMicroThumbnail(videoElement) : "";
          analyzeQrText(decodedText, thumbnail);
        },
        () => {}
      ).catch(err => {
        setIsScanning(false);
        alert(t.errorCamera);
      });
    } else if (!isScanning && scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(console.error);
      setIsTorchOn(false);
    }
  }, [isScanning]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !isTorchOn } as any]
      });
      setIsTorchOn(!isTorchOn);
    } catch (error) {
      alert("La linterna no está soportada en este dispositivo o navegador (muy común en Safari/iOS).");
    }
  };

  const copyToClipboard = (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      alert("Content could not be copied.");
    }
  };

  const renderSmartData = (text: string) => {
    if (/^WIFI:/i.test(text)) {
      const ssid = text.match(/S:([^;]+);/)?.[1] || "Desconocida";
      const pass = text.match(/P:([^;]+);/)?.[1] || "";
      return (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-left transition-colors">
          <h2 className="text-blue-800 dark:text-blue-400 font-bold text-lg mb-4 text-center">{t.wifiTitle}</h2>
          <div className="space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-semibold">SSID (Nombre)</p>
            <p className="font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded">{ssid}</p>
            {pass && (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-semibold mt-3">Contraseña</p>
                <div className="flex gap-2">
                  <p className="font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded flex-1 overflow-x-auto">{pass}</p>
                  <button 
                    onClick={() => copyToClipboard(pass)}
                    className="bg-blue-600 text-white px-4 rounded font-medium hover:bg-blue-700 transition"
                  >
                    {copiedText === pass ? t.copiedBtn : t.copyBtn}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    if (/^BEGIN:VCARD/i.test(text)) {
      const name = text.match(/FN:([^\n\r]+)/i)?.[1] || "Contacto";
      const phone = text.match(/TEL.*:([^\n\r]+)/i)?.[1] || "";
      return (
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl p-6 text-center transition-colors">
          <h2 className="text-purple-800 dark:text-purple-400 font-bold text-lg mb-2">{t.vcardTitle}</h2>
          <div className="bg-white dark:bg-slate-900 rounded shadow-inner p-4 my-4 text-left space-y-2 border border-purple-100 dark:border-purple-900">
            <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">{name}</p>
            {phone && <p className="text-slate-600 dark:text-slate-400">📞 {phone}</p>}
          </div>
          <a 
            href={`data:text/vcard;charset=utf-8,${encodeURIComponent(text)}`} 
            download="contacto.vcf"
            className="block w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition"
          >
            Guardar en Contactos
          </a>
        </div>
      );
    }

    if (/^(mailto:|tel:)/i.test(text)) {
      const isEmail = text.toLowerCase().startsWith("mailto:");
      const displayData = text.split(":")[1];
      return (
        <div className="bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 rounded-xl p-6 text-center transition-colors">
          <h2 className="text-sky-800 dark:text-sky-400 font-bold text-lg mb-2">
            {isEmail ? t.emailTitle : t.phoneTitle}
          </h2>
          <p className="text-sky-700 dark:text-sky-300 font-mono text-xl bg-white dark:bg-slate-900 p-3 rounded shadow-inner mb-4">{displayData}</p>
          <a 
            href={text} 
            className="block w-full bg-sky-600 text-white py-3 rounded-lg font-bold hover:bg-sky-700 transition"
          >
            {isEmail ? "Escribir Correo" : "Llamar Ahora"}
          </a>
        </div>
      );
    }

    return (
      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center transition-colors">
        <h2 className="text-slate-800 dark:text-slate-100 font-bold text-lg mb-2">{t.textTitle}</h2>
        <div className="relative">
          <p className="text-slate-600 dark:text-slate-300 break-all bg-white dark:bg-slate-900 p-4 rounded shadow-inner mb-4 text-left text-sm max-h-40 overflow-y-auto">
            {text}
          </p>
          <button 
            onClick={() => copyToClipboard(text)}
            className="absolute top-2 right-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            {copiedText === text ? t.copiedBtn : t.copyBtn}
          </button>
        </div>
      </div>
    );
  };

  const renderAnalysis = () => {
    if (!analysisResult) return null;

    if (!analysisResult.isUrl) {
      return renderSmartData(qrResult!);
    }

    if (analysisResult.status === "safe") {
      return (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center transition-colors">
          <h2 className="text-green-800 dark:text-green-400 font-bold text-xl mb-2">{t.safeTitle}</h2>
          <p className="text-green-700 dark:text-green-300 break-all bg-white dark:bg-slate-900 p-3 rounded border border-green-100 dark:border-green-800 shadow-inner mb-4">{qrResult}</p>
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">{t.safeDesc}</p>
        </div>
      );
    }

    if (analysisResult.status === "danger") {
      return (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center transition-colors">
          <h2 className="text-red-800 dark:text-red-400 font-bold text-xl mb-2 animate-pulse">{t.dangerTitle}</h2>
          <p className="text-red-700 dark:text-red-300 break-all bg-white dark:bg-slate-900 p-3 rounded border border-red-100 dark:border-red-800 shadow-inner mb-4">{qrResult}</p>
          <p className="text-sm text-red-600 dark:text-red-400 font-bold">
            {analysisResult.stats?.malicious} {t.dangerDesc}
          </p>
        </div>
      );
    }

    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center transition-colors">
        <h2 className="text-yellow-800 dark:text-yellow-400 font-bold text-lg mb-2">{t.unknownTitle}</h2>
        <p className="text-yellow-700 dark:text-yellow-300 break-all bg-white dark:bg-slate-900 p-3 rounded border border-yellow-100 dark:border-yellow-800 shadow-inner mb-4">{qrResult}</p>
        <p className="text-sm text-yellow-600 dark:text-yellow-400">{t.unknownDesc}</p>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors flex flex-col items-center p-4 relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div className="absolute top-4 right-4 flex gap-3 z-10">
        <button 
          onClick={toggleTheme} 
          className="bg-white dark:bg-slate-800 rounded-full shadow px-3 py-1 text-lg border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-full shadow px-3 py-1 flex gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors">
          <button onClick={() => setLang("es")} className={lang === "es" ? "text-blue-600 dark:text-blue-400" : "hover:text-blue-500"}>ES</button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <button onClick={() => setLang("en")} className={lang === "en" ? "text-blue-600 dark:text-blue-400" : "hover:text-blue-500"}>EN</button>
        </div>
      </div>

      {}
      <div className="flex-1 w-full max-w-5xl mt-16 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6">

        {}
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="bg-blue-600 dark:bg-blue-700 p-8 text-center transition-colors">
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">{t.title}</h1>
              <p className="text-blue-100 text-sm font-medium">{t.subtitle}</p>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center p-10 bg-blue-50 dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-slate-700 transition-colors">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                  <p className="text-blue-800 dark:text-blue-300 font-medium animate-pulse">{t.analyzing}</p>
                </div>
              ) : qrResult ? (
                <div className="flex flex-col gap-4">
                  {renderAnalysis()}
                  
                  {analysisResult?.isUrl && (
                    <a 
                      href={qrResult} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-full text-center py-3 rounded-lg font-bold shadow-md transition ${
                        analysisResult.status === "safe" 
                          ? "bg-green-500 hover:bg-green-600 text-white" 
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                      }`}
                    >
                      {analysisResult.status === "safe" ? t.openSafeLink : t.openDangerLink}
                    </a>
                  )}
                  
                  <button 
                    onClick={() => { setQrResult(null); setAnalysisResult(null); }}
                    className="w-full bg-blue-600 dark:bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
                  >
                    {t.scanAnother}
                  </button>
                </div>
              ) : (
                <>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileInputChange} />
                  <div 
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileScan(file);
                    }}
                  >
                    <div className="text-slate-500 dark:text-slate-400 mb-2 text-4xl group-hover:scale-110 transition-transform">📸</div>
                    <div className="text-slate-700 dark:text-slate-300 font-semibold mb-1">{t.drag}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {t.paste} <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-400">{t.pasteKeys.split('+')[0]}</kbd> + <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-400">{t.pasteKeys.split('+')[1]}</kbd> {t.pasteAction}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-400 dark:text-slate-600 my-2">
                    <hr className="flex-1 border-slate-200 dark:border-slate-800" />
                    <span className="text-xs font-semibold uppercase">{t.or}</span>
                    <hr className="flex-1 border-slate-200 dark:border-slate-800" />
                  </div>

                  <button 
                    className="w-full bg-slate-900 dark:bg-slate-800 text-white font-semibold py-4 px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    onClick={() => setIsScanning(!isScanning)}
                  >
                    <span className="text-xl">🎥</span>
                    {isScanning ? t.btnCameraOff : t.btnCameraOn}
                  </button>
                </>
              )}

              <div className="relative">
                <div id="reader" className={`w-full rounded-xl overflow-hidden ${isScanning && !qrResult ? 'block mt-4' : 'hidden'}`}></div>
                
                {isScanning && !qrResult && (
                  <button 
                    onClick={toggleTorch}
                    className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg transition-colors md:hidden ${
                      isTorchOn 
                        ? "bg-yellow-400 text-slate-900 hover:bg-yellow-500" 
                        : "bg-slate-800/80 text-white hover:bg-slate-900"
                    }`}
                    aria-label="Alternar Linterna"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="w-full bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                🕒 {t.historyTitle}
              </h2>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-xs text-red-500 hover:text-red-600 transition font-medium"
                >
                  {t.clearHistory}
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
                {t.noHistory}
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {item.thumbnail ? (
                        <img 
                          src={item.thumbnail} 
                          alt="QR thumbnail" 
                          className={`w-9 h-9 rounded object-cover border flex-shrink-0 ${
                            item.status === 'safe' ? 'border-green-400 dark:border-green-600' :
                            item.status === 'danger' ? 'border-red-400 dark:border-red-600' :
                            item.status === 'warning' ? 'border-yellow-400 dark:border-yellow-600' :
                            item.status === 'error' ? 'border-slate-400 dark:border-slate-600 opacity-60' : 'border-slate-300 dark:border-slate-700'
                          }`}
                        />
                      ) : (
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ml-1 ${
                          item.status === 'safe' ? 'bg-green-500' :
                          item.status === 'danger' ? 'bg-red-500' :
                          item.status === 'warning' ? 'bg-yellow-500' : 
                          item.status === 'error' ? 'bg-slate-500' : 'bg-slate-400'
                        }`} />
                      )}
                      
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {item.text}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {item.timestamp}
                        </span>
                      </div>
                    </div>
                    
                    {(item.status !== 'text' && item.status !== 'error') && (
                      <a 
                        href={item.text} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors ml-2 flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full bg-slate-200/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 shadow-sm transition-colors">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <span>ℹ️</span> {t.termsTitle}
            </h3>
            <div className="space-y-2">
              <p>{t.termsText1}</p>
              <p>{t.termsText2}</p>
            </div>
          </div>
        </div>

      </div>

      {}
      <footer className="mt-12 mb-6 text-slate-500 dark:text-slate-400 text-sm text-center">
        {t.footerAlert} • {new Date().getFullYear()} <span className="hidden sm:inline">•</span><br className="sm:hidden" /> By <a href="https://marabunta-labs.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors font-semibold ml-1">Marabunta Labs</a>
      </footer>
    </main>
  );
}