"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import QrScanner from "qr-scanner";

// 1. Añadidas las traducciones del historial
const translations = {
  es: {
    title: "Safe QR Scanner",
    subtitle: "Analiza cualquier código QR y descubre si esconde malware o phishing.",
    drag: "Haz clic aquí o arrastra una imagen",
    paste: "o presiona",
    pasteKeys: "Ctrl + V",
    pasteAction: "para pegar",
    or: "o también",
    btnCameraOn: "Activar Cámara del Dispositivo",
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
    openSafeLink: "Acceder al enlace",
    openDangerLink: "Abrir enlace de todos modos",
    historyTitle: "Escaneos Recientes",
    clearHistory: "Borrar todo",
    noHistory: "No hay escaneos recientes"
  },
  en: {
    title: "Safe QR Scanner",
    subtitle: "Scan any QR code and find out if it hides malware or phishing.",
    drag: "Click here or drag an image",
    paste: "or press",
    pasteKeys: "Ctrl + V",
    pasteAction: "to paste",
    or: "or else",
    btnCameraOn: "Activate Device Camera",
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
    openSafeLink: "Access link",
    openDangerLink: "Open link anyway",
    historyTitle: "Recent Scans",
    clearHistory: "Clear all",
    noHistory: "No recent scans"
  }
};

type Lang = "es" | "en";

// 2. Interfaz para el tipo de datos del historial
interface HistoryItem {
  id: string;
  text: string;
  status: "safe" | "danger" | "warning" | "text";
  timestamp: string;
}

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [lang, setLang] = useState<Lang>("es");
  
  const [qrResult, setQrResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // 3. Estado del historial
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  // 4. Cargar historial de localStorage al montar el componente (Soluciona el problema de SSR de Next.js)
  useEffect(() => {
    const savedHistory = localStorage.getItem("safe_qr_history");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode("reader");
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
      scannerRef.current?.clear();
    };
  }, []);

  // 5. Función para guardar en el historial
  const addToHistory = (text: string, status: HistoryItem["status"]) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      text,
      status,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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

  const analyzeQrText = async (text: string) => {
    setQrResult(text);
    setIsScanning(false);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/check-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setAnalysisResult(data);

      // 6. Evaluamos el resultado y lo añadimos al historial automáticamente
      let status: HistoryItem["status"] = "text";
      if (data.isUrl) {
        if (data.status === "safe") status = "safe";
        else if (data.status === "danger") status = "danger";
        else status = "warning"; // Desconocido/Precaución
      }
      
      addToHistory(text, status);

    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileScan = async (file: File) => {
    try {
      const result = await QrScanner.scanImage(file, { 
        returnDetailedScanResult: true 
      });
      analyzeQrText(result.data);
    } catch (err) {
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
        (decodedText) => {
          analyzeQrText(decodedText);
        },
        () => {}
      ).catch(err => {
        setIsScanning(false);
        alert(t.errorCamera);
      });
    } else if (!isScanning && scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
  }, [isScanning]);

  const renderAnalysis = () => {
    if (!analysisResult) return null;

    if (!analysisResult.isUrl) {
      return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <h2 className="text-slate-800 font-bold text-lg mb-2">{t.textTitle}</h2>
          <p className="text-slate-600 break-all bg-white p-3 rounded shadow-inner mb-4">{qrResult}</p>
        </div>
      );
    }

    if (analysisResult.status === "safe") {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <h2 className="text-green-800 font-bold text-xl mb-2">{t.safeTitle}</h2>
          <p className="text-green-700 break-all bg-white p-3 rounded border border-green-100 shadow-inner mb-4">{qrResult}</p>
          <p className="text-sm text-green-600 font-medium">VirusTotal no ha detectado amenazas.</p>
        </div>
      );
    }

    if (analysisResult.status === "danger") {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-red-800 font-bold text-xl mb-2 animate-pulse">{t.dangerTitle}</h2>
          <p className="text-red-700 break-all bg-white p-3 rounded border border-red-100 shadow-inner mb-4">{qrResult}</p>
          <p className="text-sm text-red-600 font-bold">
            {analysisResult.stats?.malicious} motores de seguridad marcan este enlace como malicioso. ¡No lo abras!
          </p>
        </div>
      );
    }

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <h2 className="text-yellow-800 font-bold text-lg mb-2">{t.unknownTitle}</h2>
        <p className="text-yellow-700 break-all bg-white p-3 rounded border border-yellow-100 shadow-inner mb-4">{qrResult}</p>
        <p className="text-sm text-yellow-600">No hay datos en VirusTotal sobre este enlace. Procede con precaución.</p>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 bg-white rounded-full shadow px-3 py-1 flex gap-2 text-sm font-semibold text-slate-600 border border-slate-200">
        <button onClick={() => setLang("es")} className={lang === "es" ? "text-blue-600" : "hover:text-blue-500"}>ES</button>
        <span className="text-slate-300">|</span>
        <button onClick={() => setLang("en")} className={lang === "en" ? "text-blue-600" : "hover:text-blue-500"}>EN</button>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 mt-8">
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">{t.title}</h1>
          <p className="text-blue-100 text-sm font-medium">{t.subtitle}</p>
        </div>

        <div className="p-6 flex flex-col gap-4">
          
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center p-10 bg-blue-50 rounded-xl border border-blue-100">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-blue-800 font-medium animate-pulse">{t.analyzing}</p>
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
                      ? "bg-green-500 text-white hover:bg-green-600" 
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {analysisResult.status === "safe" ? t.openSafeLink : t.openDangerLink}
                </a>
              )}
              
              <button 
                onClick={() => { setQrResult(null); setAnalysisResult(null); }}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
              >
                {t.scanAnother}
              </button>
            </div>
          ) : (
            <>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileInputChange} />
              <div 
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileScan(file);
                }}
              >
                <div className="text-slate-500 mb-2 text-4xl group-hover:scale-110 transition-transform">📸</div>
                <div className="text-slate-700 font-semibold mb-1">{t.drag}</div>
                <div className="text-xs text-slate-400">
                  {t.paste} <kbd className="bg-slate-200 px-1 rounded text-slate-600">{t.pasteKeys.split('+')[0]}</kbd> + <kbd className="bg-slate-200 px-1 rounded text-slate-600">{t.pasteKeys.split('+')[1]}</kbd> {t.pasteAction}
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400 my-2">
                <hr className="flex-1 border-slate-200" />
                <span className="text-xs font-semibold uppercase">{t.or}</span>
                <hr className="flex-1 border-slate-200" />
              </div>

              <button 
                className="w-full bg-slate-900 text-white font-semibold py-4 px-4 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                onClick={() => setIsScanning(!isScanning)}
              >
                <span className="text-xl">🎥</span>
                {isScanning ? t.btnCameraOff : t.btnCameraOn}
              </button>
            </>
          )}

          <div id="reader" className={`w-full rounded-xl overflow-hidden ${isScanning && !qrResult ? 'block mt-4' : 'hidden'}`}></div>
        </div>
      </div>

      {/* 7. SECCIÓN DEL HISTORIAL */}
      <div className="max-w-md w-full mt-6 bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-md font-bold text-slate-700 flex items-center gap-2">
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
          <p className="text-sm text-slate-400 text-center py-2">
            {t.noHistory}
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {history.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    item.status === 'safe' ? 'bg-green-500' :
                    item.status === 'danger' ? 'bg-red-500' :
                    item.status === 'warning' ? 'bg-yellow-500' : 'bg-slate-400'
                  }`} />
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {item.text}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {item.timestamp}
                    </span>
                  </div>
                </div>
                
                {item.status !== 'text' && (
                  <a 
                    href={item.text} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-blue-500 transition-colors ml-2 flex-shrink-0"
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

      {/* Caja de Términos y Condiciones */}
      <div className="max-w-md w-full mt-6 bg-slate-200/50 rounded-xl p-5 border border-slate-200 text-sm text-slate-600 shadow-sm">
        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
          <span>ℹ️</span> {t.termsTitle}
        </h3>
        <div className="space-y-2">
          <p>{t.termsText1}</p>
          <p>{t.termsText2}</p>
        </div>
      </div>

      <footer className="mt-8 mb-4 text-slate-400 text-sm">
        {t.footerAlert} • {new Date().getFullYear()}
      </footer>
    </main>
  );
}