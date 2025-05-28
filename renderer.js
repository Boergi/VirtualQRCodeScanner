// renderer.js
// Handles UI, camera, and barcode scanning

console.log('Renderer.js wird geladen...');

const video = document.getElementById('video');
const resultDiv = document.getElementById('result');
const retryBtn = document.getElementById('retry');
const settingsBtn = document.getElementById('settingsBtn');
const settingsDiv = document.getElementById('settingsDiv');
const enterCheckbox = document.getElementById('enterCheckbox');
const tabCheckbox = document.getElementById('tabCheckbox');
const cameraSelect = document.getElementById('cameraSelect');
const testBtn = document.getElementById('testBtn');
const resetPauseBtn = document.getElementById('resetPauseBtn');
const countdownDisplay = document.getElementById('countdownDisplay');
const countdownTimer = document.getElementById('countdownTimer');
const videoOverlay = document.getElementById('videoOverlay');
const fullscreenBtn = document.getElementById('fullscreenBtn');

let scanning = false;
let retryTimeout;
let availableCameras = [];
let currentStream = null;
let scanningCanvas = null;
let scanningContext = null;
let scanningInterval = null;
let barcodeSupport = null;
let isPaused = false;
let lastScannedCode = null;
let pauseTimeout = null;
let countdownInterval = null;
let pendingCode = null; // Für Code-Bestätigung
let codeConfirmationCount = 0; // Anzahl der Bestätigungen

// Status-Update-Funktion für moderne UI
function updateStatus(message, type = 'scanning') {
  const statusContent = resultDiv.querySelector('.status-content');
  statusContent.textContent = message;
  
  // Entferne alle Status-Klassen
  resultDiv.classList.remove('status-scanning', 'status-success', 'status-error', 'status-paused');
  
  // Füge passende Klasse hinzu
  resultDiv.classList.add(`status-${type}`);
}

// Countdown-Display-Funktion
function showCountdown(seconds) {
  countdownDisplay.style.display = 'block';
  countdownTimer.textContent = seconds;
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  countdownInterval = setInterval(() => {
    seconds--;
    countdownTimer.textContent = seconds;
    
    if (seconds <= 0) {
      clearInterval(countdownInterval);
      countdownDisplay.style.display = 'none';
    }
  }, 1000);
}

// Loading-Overlay für Video
function showVideoLoading(show = true) {
  videoOverlay.style.display = show ? 'flex' : 'none';
}

// Funktion zur Validierung von erkannten Codes
function isValidTextCode(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Mindestlänge und Maximallänge prüfen
  if (text.length < 3 || text.length > 100) {
    return false;
  }
  
  // URLs und Web-Links ignorieren
  const urlPatterns = [
    /^https?:\/\//i,           // http:// oder https://
    /^ftp:\/\//i,              // ftp://
    /^www\./i,                 // www.
    /\.(com|org|net|de|co|io|app|gov|edu|mil)/i, // Domain-Endungen
    /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i, // Domain-Format
  ];
  
  if (urlPatterns.some(pattern => pattern.test(text))) {
    console.log('URL/Domain erkannt, ignoriere:', text);
    return false;
  }
  
  // E-Mail-Adressen ignorieren
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailPattern.test(text)) {
    console.log('E-Mail erkannt, ignoriere:', text);
    return false;
  }
  
  // Telefonnummern ignorieren (verschiedene Formate)
  const phonePatterns = [
    /^\+?[\d\s\-\(\)]{10,}$/,  // Internationale Nummern
    /^[\d\s\-\(\)]{10,}$/,     // Lokale Nummern
  ];
  
  if (phonePatterns.some(pattern => pattern.test(text))) {
    console.log('Telefonnummer erkannt, ignoriere:', text);
    return false;
  }
  
  // JSON/XML-artige Strukturen ignorieren
  if (text.startsWith('{') || text.startsWith('[') || text.startsWith('<')) {
    console.log('Strukturierte Daten erkannt, ignoriere:', text);
    return false;
  }
  
  // WiFi-QR-Codes ignorieren (WIFI:T:WPA;S:NetworkName;P:password;;)
  if (text.startsWith('WIFI:') || text.includes('SSID:') || text.includes('PASSWORD:')) {
    console.log('WiFi-Code erkannt, ignoriere:', text);
    return false;
  }
  
  // vCard/Contact-Codes ignorieren
  if (text.startsWith('BEGIN:VCARD') || text.includes('FN:') || text.includes('TEL:')) {
    console.log('vCard erkannt, ignoriere:', text);
    return false;
  }
  
  // SMS/MMS-Codes ignorieren
  if (text.startsWith('SMSTO:') || text.startsWith('sms:') || text.startsWith('tel:')) {
    console.log('SMS/Tel-Code erkannt, ignoriere:', text);
    return false;
  }
  
  // Geo-Location-Codes ignorieren
  if (text.startsWith('geo:') || text.includes('latitude') || text.includes('longitude')) {
    console.log('Geo-Location erkannt, ignoriere:', text);
    return false;
  }
  
  // Kalenderevent-Codes ignorieren
  if (text.startsWith('BEGIN:VEVENT') || text.includes('DTSTART:') || text.includes('SUMMARY:')) {
    console.log('Kalenderevent erkannt, ignoriere:', text);
    return false;
  }
  
  // Nur alphanumerische Zeichen, Leerzeichen, und häufige Satzzeichen erlauben
  const allowedCharsPattern = /^[a-zA-Z0-9\s\-_.,!?äöüÄÖÜß]+$/;
  if (!allowedCharsPattern.test(text)) {
    console.log('Unerlaubte Zeichen erkannt, ignoriere:', text);
    return false;
  }
  
  // Prüfe auf zu viele Sonderzeichen (mehr als 20% der Gesamtlänge)
  const specialChars = text.match(/[^a-zA-Z0-9\s]/g);
  if (specialChars && (specialChars.length / text.length) > 0.2) {
    console.log('Zu viele Sonderzeichen, ignoriere:', text);
    return false;
  }
  
  // Prüfe auf mindestens einen Buchstaben (keine reinen Zahlenfolgen)
  if (!/[a-zA-ZäöüÄÖÜß]/.test(text)) {
    console.log('Keine Buchstaben gefunden, ignoriere:', text);
    return false;
  }
  
  console.log('Gültiger Text-Code erkannt:', text);
  return true;
}

// Erweiterte QR-Code-Validierung mit Qualitätsprüfung
function validateQRCodeQuality(qrCode) {
  if (!qrCode || !qrCode.data) {
    return false;
  }
  
  // Prüfe die Erkennungsqualität anhand der Location-Punkte
  if (qrCode.location) {
    const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = qrCode.location;
    
    // Berechne die Fläche des erkannten QR-Codes
    const width1 = Math.abs(topRightCorner.x - topLeftCorner.x);
    const width2 = Math.abs(bottomRightCorner.x - bottomLeftCorner.x);
    const height1 = Math.abs(bottomLeftCorner.y - topLeftCorner.y);
    const height2 = Math.abs(bottomRightCorner.y - topRightCorner.y);
    
    // QR-Code sollte eine Mindestgröße haben (zu kleine sind oft Falscherkennung)
    const minSize = 50; // Pixel
    if (width1 < minSize || width2 < minSize || height1 < minSize || height2 < minSize) {
      console.log('QR-Code zu klein, ignoriere:', qrCode.data);
      return false;
    }
    
    // QR-Code sollte nicht zu verzerrt sein (Verhältnis von Breite zu Höhe)
    const ratio1 = width1 / height1;
    const ratio2 = width2 / height2;
    if (ratio1 < 0.7 || ratio1 > 1.3 || ratio2 < 0.7 || ratio2 > 1.3) {
      console.log('QR-Code zu verzerrt, ignoriere:', qrCode.data);
      return false;
    }
  }
  
  return true;
}

// Sound-Feedback Funktion
function playBeepSound() {
  try {
    // Erstelle einen kurzen Beep-Ton
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz Ton
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Sound konnte nicht abgespielt werden:', e.message);
  }
}

async function loadCameras() {
  console.log('Starte loadCameras...');
  
  try {
    showVideoLoading(true);
    updateStatus('Kameras werden geladen...', 'scanning');
    
    // Erst Berechtigung anfordern, damit wir Labels bekommen
    const testStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    console.log('Test-Stream erhalten, stoppe wieder...');
    testStream.getTracks().forEach(track => track.stop());
    
    // Jetzt Kameras laden - mit Labels
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === 'videoinput');
    
    console.log('Gefundene Geräte:', devices.length);
    console.log('Gefundene Kameras:', cameras.length);
    
    cameraSelect.innerHTML = '';
    
    if (cameras.length === 0) {
      cameraSelect.innerHTML = '<option value="">❌ Keine Kameras gefunden</option>';
      updateStatus('Keine Kameras verfügbar', 'error');
      showVideoLoading(false);
      return;
    }
    
    cameras.forEach((camera, index) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.textContent = camera.label || `📹 Kamera ${index + 1}`;
      cameraSelect.appendChild(option);
      console.log(`Kamera ${index + 1}:`, camera.label || 'Kein Label', camera.deviceId);
    });
    
    availableCameras = cameras;
    updateStatus('Kameras geladen - Bereit zum Starten', 'success');
    
    console.log('Kamera-Laden erfolgreich, verfügbare Kameras:', cameras.length);
  } catch (e) {
    console.error('Fehler beim Laden der Kameras:', e);
    updateStatus('Fehler beim Laden: ' + e.message, 'error');
    cameraSelect.innerHTML = '<option value="">❌ Fehler beim Laden</option>';
    showVideoLoading(false);
  }
}

async function startCamera(deviceId = null) {
  try {
    console.log('Starte Kamera mit deviceId:', deviceId);
    showVideoLoading(true);
    updateStatus('Kamera wird gestartet...', 'scanning');
    
    // Stoppe vorherigen Stream und Scanning
    if (scanningInterval) {
      clearInterval(scanningInterval);
      scanningInterval = null;
    }
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    
    // Verwende ausgewählte Kamera oder Standard
    const selectedDeviceId = deviceId || cameraSelect.value;
    console.log('Verwende deviceId:', selectedDeviceId);
    
    const constraints = {
      video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
    };
    
    console.log('Constraints:', constraints);
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    console.log('Stream erhalten:', stream.getTracks().length, 'tracks');
    
    video.srcObject = stream;
    
    video.onloadedmetadata = () => {
      console.log('Video-Metadaten geladen');
      showVideoLoading(false);
      updateStatus('Kamera aktiv - Scanner wird initialisiert...', 'scanning');
      
      // Canvas für QR-Code-Scanning erstellen
      if (!scanningCanvas) {
        scanningCanvas = document.createElement('canvas');
        scanningContext = scanningCanvas.getContext('2d');
      }
      
      // QR-Code-Scanning starten
      startQRScanning();
    };
    
    await video.play();
    console.log('Video spielt');
    
    scanning = true;
    
  } catch (e) {
    console.error('Kamera-Fehler:', e);
    showVideoLoading(false);
    updateStatus(`Kamera-Fehler: ${e.message}`, 'error');
    handleError(e);
  }
}

function startQRScanning() {
  console.log('Starte Code-Scanning...');
  updateStatus('🔍 Scanner aktiv', 'scanning');
  
  // Initialisiere erweiterte Barcode-Unterstützung, falls verfügbar
  if (!barcodeSupport && window.BarcodeSupport) {
    barcodeSupport = new window.BarcodeSupport();
    barcodeSupport.initialize().then(success => {
      if (success) {
        console.log('Erweiterte Barcode-Unterstützung aktiviert');
        updateStatus('🔍 Scanner aktiv - Text-QR-Codes und Text-Barcodes werden erkannt', 'scanning');
      }
    });
  }
  
  scanningInterval = setInterval(async () => {
    // Überspringe Scanning während der Pause
    if (isPaused) {
      return;
    }
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      scanningCanvas.height = video.videoHeight;
      scanningCanvas.width = video.videoWidth;
      
      scanningContext.drawImage(video, 0, 0, scanningCanvas.width, scanningCanvas.height);
      const imageData = scanningContext.getImageData(0, 0, scanningCanvas.width, scanningCanvas.height);
      
      let detectedCode = null;
      
      // Versuche zuerst mit jsQR (QR-Codes, sehr zuverlässig) - nur wenn verfügbar
      if (typeof jsQR !== 'undefined') {
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (qrCode && validateQRCodeQuality(qrCode) && isValidTextCode(qrCode.data)) {
          detectedCode = { text: qrCode.data, format: 'QR-Code' };
        }
      }
      
      // Falls jsQR nicht verfügbar oder kein QR-Code gefunden, versuche ZXing
      // Aber nur für erweiterte Barcodes, nicht für QR-Codes (um Doppelerkennung zu vermeiden)
      if (!detectedCode && barcodeSupport) {
        const barcodeResult = await barcodeSupport.scanBarcode(imageData);
        if (barcodeResult && barcodeResult.format !== 'QR-Code' && isValidTextCode(barcodeResult.text)) {
          detectedCode = { text: barcodeResult.text, format: barcodeResult.format };
        }
      }
      
      // Prüfe, ob es ein neuer Code ist und implementiere Bestätigungslogik
      if (detectedCode) {
        // Wenn es der gleiche Code ist wie beim letzten Scan
        if (pendingCode && pendingCode.text === detectedCode.text) {
          codeConfirmationCount++;
          console.log(`Code-Bestätigung ${codeConfirmationCount}/3:`, detectedCode.text);
          
          // Erst nach 3 aufeinanderfolgenden Erkennungen akzeptieren
          if (codeConfirmationCount >= 3 && detectedCode.text !== lastScannedCode) {
            console.log(`✅ ${detectedCode.format} bestätigt:`, detectedCode.text);
            
            // Code wurde bestätigt, verarbeiten
            processValidatedCode(detectedCode);
            
            // Reset der Bestätigungslogik
            pendingCode = null;
            codeConfirmationCount = 0;
          }
        } else {
          // Neuer Code erkannt, starte Bestätigungslogik
          pendingCode = detectedCode;
          codeConfirmationCount = 1;
          console.log(`🔍 Neuer Code erkannt, warte auf Bestätigung:`, detectedCode.text);
        }
      } else {
        // Kein Code erkannt, reset der Bestätigungslogik
        if (pendingCode) {
          console.log('Code-Erkennung unterbrochen, reset');
          pendingCode = null;
          codeConfirmationCount = 0;
        }
      }
    }
  }, 250); // Alle 250ms scannen
}

// Funktion zur Verarbeitung bestätigter Codes
async function processValidatedCode(detectedCode) {
  // Merke den Code, um Duplikate zu vermeiden
  lastScannedCode = detectedCode.text;
  
  // Spiele Beep-Sound ab
  playBeepSound();
  
  // Pausiere Scanning für 10 Sekunden
  isPaused = true;
  resetPauseBtn.style.display = 'inline-block'; // Zeige Reset-Button
  updateStatus(`📱 ${detectedCode.format}: ${detectedCode.text} - Wird gesendet...`, 'success');
  
  // Zeige Countdown
  showCountdown(10);
  
  // Sende Code an Main Process
  if (window.electronAPI && window.electronAPI.codeScanned) {
    try {
      const result = await window.electronAPI.codeScanned(detectedCode.text);
      
      if (result.success) {
        console.log('Code erfolgreich gesendet:', result);
        updateStatus(`✅ ${detectedCode.format}: ${detectedCode.text} - Erfolgreich gesendet!`, 'success');
      } else {
        console.error('Fehler beim Senden:', result.error);
        updateStatus(`❌ ${detectedCode.format}: ${detectedCode.text} - Fehler: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Fehler beim Senden:', error);
      updateStatus(`❌ ${detectedCode.format}: ${detectedCode.text} - Verbindungsfehler`, 'error');
    }
  } else {
    console.warn('electronAPI nicht verfügbar');
    updateStatus(`⚠️ ${detectedCode.format}: ${detectedCode.text} - API nicht verfügbar`, 'error');
  }
  
  // Auto-Reset nach 10 Sekunden
  pauseTimeout = setTimeout(() => {
    resetPause();
  }, 10000);
}

// Funktion zum Zurücksetzen der Pause
function resetPause() {
  isPaused = false;
  lastScannedCode = null;
  pendingCode = null;
  codeConfirmationCount = 0;
  resetPauseBtn.style.display = 'none';
  countdownDisplay.style.display = 'none';
  
  if (pauseTimeout) {
    clearTimeout(pauseTimeout);
    pauseTimeout = null;
  }
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  updateStatus('🔍 Scanner aktiv', 'scanning');
}

function handleError(e) {
  let errorMessage = `❌ Fehler: ${e && e.message ? e.message : e}`;
  
  if (e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')) {
    errorMessage += '\n💡 Bitte Kamera-Rechte in den macOS-Systemeinstellungen aktivieren.';
  }
  
  updateStatus(errorMessage, 'error');
  scanning = false;
  showVideoLoading(false);
  
  if (retryTimeout) clearTimeout(retryTimeout);
  retryTimeout = setTimeout(() => startCamera(), 2000);
}

retryBtn.onclick = () => {
  if (!scanning) {
    showVideoLoading(true);
    startCamera();
  }
};

cameraSelect.onchange = () => {
  if (cameraSelect.value) {
    startCamera(cameraSelect.value);
  }
};

settingsBtn.onclick = async () => {
  const isVisible = settingsDiv.classList.contains('active');
  
  if (isVisible) {
    settingsDiv.classList.remove('active');
    settingsBtn.textContent = '⚙️ Einstellungen';
  } else {
    settingsDiv.classList.add('active');
    settingsBtn.textContent = '✕ Schließen';
    
    // Lade aktuelle Einstellungen
    try {
      const settings = await window.electronAPI.getSettings();
      enterCheckbox.checked = settings.sendEnter;
      tabCheckbox.checked = settings.sendTab;
    } catch (e) {
      console.error('Fehler beim Laden der Einstellungen:', e);
    }
  }
};

enterCheckbox.onchange = () => {
  window.electronAPI.setSettings({ sendEnter: enterCheckbox.checked });
};

tabCheckbox.onchange = () => {
  window.electronAPI.setSettings({ sendTab: tabCheckbox.checked });
};

testBtn.onclick = async () => {
  // Verhindere mehrfache Klicks
  if (testBtn.disabled) return;
  
  try {
    testBtn.disabled = true;
    testBtn.textContent = '⏳ Teste...';
    updateStatus('🧪 Teste Tastatur-Eingabe...', 'scanning');
    
    const result = await window.electronAPI.codeScanned('TEST123');
    
    if (result.success) {
      updateStatus('✅ Tastatur-Test erfolgreich! (TEST123 wurde getippt)', 'success');
    } else {
      updateStatus(`❌ Tastatur-Test fehlgeschlagen: ${result.error}`, 'error');
    }
  } catch (error) {
    updateStatus(`❌ Tastatur-Test Fehler: ${error.message}`, 'error');
  } finally {
    // Button nach 3 Sekunden wieder aktivieren
    setTimeout(() => {
      testBtn.disabled = false;
      testBtn.textContent = '⌨️ Tastatur testen';
      
      if (!isPaused) {
        updateStatus('🔍 Scanner aktiv', 'scanning');
      }
    }, 3000);
  }
};

resetPauseBtn.onclick = () => {
  resetPause();
};

fullscreenBtn.onclick = () => {
  if (video.requestFullscreen) {
    video.requestFullscreen();
  } else if (video.webkitRequestFullscreen) {
    video.webkitRequestFullscreen();
  } else if (video.msRequestFullscreen) {
    video.msRequestFullscreen();
  }
};

window.onload = async () => {
  console.log('Seite geladen, starte Initialisierung...');
  updateStatus('🚀 Initialisierung...', 'scanning');
  
  // Zunächst Kameras laden (um Dropdown zu füllen)
  await loadCameras();
  
  // Dann erste verfügbare Kamera starten
  if (availableCameras.length > 0) {
    cameraSelect.value = availableCameras[0].deviceId;
    await startCamera(availableCameras[0].deviceId);
  } else {
    console.log('Keine Kameras verfügbar, starte Standard-Kamera...');
    await startCamera();
  }
};
