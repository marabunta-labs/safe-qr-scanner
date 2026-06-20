import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const MUESTRAS_POR_TIPO = 5; 
const benignDir = path.join(process.cwd(), 'e2e/test-dataset/QRcodes/benign');
const maliciousDir = path.join(process.cwd(), 'e2e/test-dataset/QRcodes/malicious');

// Creamos un archivo temporal para compartir el sorteo entre todos los procesos
const cacheFile = path.join(process.cwd(), 'e2e/.sorteo-cache.json');

function obtenerImagenesDePrueba() {
  // 1. ¿Somos un "Worker" (ejecutando tests)? 
  // Entonces NO sorteamos, leemos lo que el Runner haya guardado.
  if (process.env.TEST_WORKER_INDEX !== undefined) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  }

  // 2. ¿Somos el "Runner" principal? ¡Hacemos el sorteo aleatorio!
  const sacarAleatorios = (directorio: string, tipo: string) => {
    if (!fs.existsSync(directorio)) return [];
    const archivos = fs.readdirSync(directorio).filter(f => /.*\.(png|jpe?g)$/i.test(f));
    const barajados = archivos.sort(() => 0.5 - Math.random());
    return barajados.slice(0, MUESTRAS_POR_TIPO).map(a => ({
      nombre: a, rutaAbsoluta: path.join(directorio, a), tipo
    }));
  };

  const seleccion = [
    ...sacarAleatorios(benignDir, 'benign'),
    ...sacarAleatorios(maliciousDir, 'malicious')
  ];

  // Guardamos los resultados del sorteo en el disco para que los workers lo lean
  fs.writeFileSync(cacheFile, JSON.stringify(seleccion));
  return seleccion;
}

// Se ejecuta al cargar el archivo. El Runner crea el caché, los Workers lo consumen.
const imagenesDePrueba = obtenerImagenesDePrueba();

test.describe('Evaluación Aleatoria Perfecta (Seguros vs Peligrosos)', () => {
  
  for (const item of imagenesDePrueba) {
    const esMalicioso = item.tipo === 'malicious';
    
    test(`Detectar [${item.tipo.toUpperCase()}]: ${item.nombre}`, async ({ page }) => {
      
      await page.route('**/api/check-url', async route => {
        if (esMalicioso) {
          await route.fulfill({ 
            json: { isUrl: true, status: "danger", stats: { malicious: 5, phishing: 1 } } 
          });
        } else {
          await route.fulfill({ 
            json: { isUrl: true, status: "safe", stats: { malicious: 0, phishing: 0 } } 
          });
        }
      });

      await page.goto('http://localhost:3000');
      await page.setInputFiles('input[type="file"]', item.rutaAbsoluta);

      if (esMalicioso) {
        const dangerTitle = page.locator('text=⚠️ ¡Peligro Detectado!');
        await expect(dangerTitle).toBeVisible({ timeout: 5000 });
        
        const dangerButton = page.locator('a:has-text("Abrir enlace de todos modos")');
        await expect(dangerButton).toBeVisible();
      } else {
        const safeTitle = page.locator('text=✅ Enlace Seguro');
        await expect(safeTitle).toBeVisible({ timeout: 5000 });
        
        const safeButton = page.locator('a:has-text("Acceder al enlace")');
        await expect(safeButton).toBeVisible();
      }
    });
  }
});