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
      cameraSelect.innerHTML = '<option value="">Keine Kameras gefunden</option>';
      resultDiv.textContent = 'Keine Kameras gefunden';
      return;
    }
    
    cameras.forEach((camera, index) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.textContent = camera.label || `Kamera ${index + 1}`;
      cameraSelect.appendChild(option);
      console.log(`Kamera ${index + 1}:`, camera.label || 'Kein Label', camera.deviceId);
    });
    
    availableCameras = cameras;
    
    console.log('Kamera-Laden erfolgreich, verfügbare Kameras:', cameras.length);
  } catch (e) {
    console.error('Fehler beim Laden der Kameras:', e);
    resultDiv.textContent = 'Fehler beim Laden: ' + e.message;
    cameraSelect.innerHTML = '<option value="">Fehler beim Laden</option>';
  }
}

async function startCamera(deviceId = null) {
  try {
    console.log('Starte Kamera mit deviceId:', deviceId);
    resultDiv.textContent = 'Kamera wird gestartet...';
    
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
      resultDiv.textContent = 'Kamera aktiv - Scanner wird initialisiert...';
      
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
    resultDiv.textContent = `Kamera-Fehler: ${e.message}`;
    handleError(e);
  }
}

function startQRScanning() {
  console.log('Starte Code-Scanning...');
  resultDiv.textContent = 'Scanner aktiv - halte Code vor die Kamera';
  
  // Initialisiere erweiterte Barcode-Unterstützung, falls verfügbar
  if (!barcodeSupport && window.BarcodeSupport) {
    barcodeSupport = new window.BarcodeSupport();
    barcodeSupport.initialize().then(success => {
      if (success) {
        console.log('Erweiterte Barcode-Unterstützung aktiviert');
        resultDiv.textContent = 'Scanner aktiv - QR-Codes und Barcodes werden unterstützt';
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
        
        if (qrCode) {
          detectedCode = { text: qrCode.data, format: 'QR-Code' };
        }
      }
      
      // Falls jsQR nicht verfügbar oder kein QR-Code gefunden, versuche ZXing
      if (!detectedCode && barcodeSupport) {
        const barcodeResult = await barcodeSupport.scanBarcode(imageData);
        if (barcodeResult) {
          detectedCode = { text: barcodeResult.text, format: barcodeResult.format };
        }
      }
      
      // Prüfe, ob es ein neuer Code ist (nicht der gleiche wie vorhin)
      if (detectedCode && detectedCode.text !== lastScannedCode) {
        console.log(`${detectedCode.format} gefunden:`, detectedCode.text);
        
        // Merke den Code, um Duplikate zu vermeiden
        lastScannedCode = detectedCode.text;
        
        // Spiele Beep-Sound ab
        playBeepSound();
        
        // Pausiere Scanning für 10 Sekunden
        isPaused = true;
        resetPauseBtn.style.display = 'inline-block'; // Zeige Reset-Button
        resultDiv.textContent = `${detectedCode.format}: ${detectedCode.text} - Sende...`;
        
        // Visuelles Feedback
        resultDiv.style.backgroundColor = '#004400';
        resultDiv.style.color = 'white';
        
        // Sende Code an Main Process
        if (window.electronAPI && window.electronAPI.codeScanned) {
          try {
            const result = await window.electronAPI.codeScanned(detectedCode.text);
            
            if (result.success) {
              console.log('Code erfolgreich gesendet:', result);
              resultDiv.textContent = `${detectedCode.format}: ${detectedCode.text} - ✓ Gesendet - Pause 10s`;
              resultDiv.style.backgroundColor = '#006600';
            } else {
              console.error('Fehler beim Senden:', result.error);
              resultDiv.textContent = `${detectedCode.format}: ${detectedCode.text} - ✗ Fehler: ${result.error}`;
              resultDiv.style.backgroundColor = '#660000';
            }
          } catch (error) {
            console.error('Fehler beim Senden:', error);
            resultDiv.textContent = `${detectedCode.format}: ${detectedCode.text} - ✗ Verbindungsfehler`;
            resultDiv.style.backgroundColor = '#660000';
          }
        } else {
          console.warn('electronAPI nicht verfügbar');
          resultDiv.textContent = `${detectedCode.format}: ${detectedCode.text} - API nicht verfügbar`;
          resultDiv.style.backgroundColor = '#666600';
        }
        
        // Starte 10-Sekunden Countdown
        let countdown = 10;
        const countdownInterval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            resultDiv.textContent = `Pause noch ${countdown}s - Code wegziehen`;
          } else {
            clearInterval(countdownInterval);
            resetPause();
          }
        }, 1000);
      }
    }
  }, 250); // Alle 250ms scannen
}

// Funktion zum Zurücksetzen der Pause
function resetPause() {
  isPaused = false;
  lastScannedCode = null;
  resetPauseBtn.style.display = 'none';
  
  resultDiv.textContent = 'Scanner aktiv - halte Code vor die Kamera';
  resultDiv.style.backgroundColor = '';
  resultDiv.style.color = '';
}

function handleError(e) {
  resultDiv.textContent = `Fehler: ${e && e.message ? e.message : e}`;
  if (e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')) {
    resultDiv.textContent += '\nBitte Kamera-Rechte in den macOS-Systemeinstellungen aktivieren.';
  }
  scanning = false;
  if (retryTimeout) clearTimeout(retryTimeout);
  retryTimeout = setTimeout(() => startCamera(), 2000);
}

retryBtn.onclick = () => {
  if (!scanning) startCamera();
};

cameraSelect.onchange = () => {
  if (cameraSelect.value) {
    startCamera(cameraSelect.value);
  }
};

settingsBtn.onclick = async () => {
  settingsDiv.style.display = settingsDiv.style.display === 'none' ? 'block' : 'none';
  const settings = await window.electronAPI.getSettings();
  enterCheckbox.checked = settings.sendEnter;
  tabCheckbox.checked = settings.sendTab;
};

enterCheckbox.onchange = () => {
  window.electronAPI.setSettings({ sendEnter: enterCheckbox.checked });
};
tabCheckbox.onchange = () => {
  window.electronAPI.setSettings({ sendTab: tabCheckbox.checked });
};

testBtn.onclick = async () => {
  try {
    resultDiv.textContent = 'Teste Tastatur-Eingabe...';
    resultDiv.style.backgroundColor = '#004488';
    resultDiv.style.color = 'white';
    
    const result = await window.electronAPI.codeScanned('TEST123');
    
    if (result.success) {
      resultDiv.textContent = 'Tastatur-Test erfolgreich! (TEST123 wurde getippt)';
      resultDiv.style.backgroundColor = '#006600';
    } else {
      resultDiv.textContent = `Tastatur-Test fehlgeschlagen: ${result.error}`;
      resultDiv.style.backgroundColor = '#660000';
    }
  } catch (error) {
    resultDiv.textContent = `Tastatur-Test Fehler: ${error.message}`;
    resultDiv.style.backgroundColor = '#660000';
  }
  
  setTimeout(() => {
    resultDiv.style.backgroundColor = '';
    resultDiv.style.color = '';
    resultDiv.textContent = 'Scanner aktiv - halte Code vor die Kamera';
  }, 3000);
};

resetPauseBtn.onclick = () => {
  resetPause();
};

window.onload = async () => {
  console.log('Seite geladen, starte Initialisierung...');
  
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
