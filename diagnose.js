// diagnose.js - Diagnose-Script für die VirtualQRCodeScanner App

console.log('=== VirtualQRCodeScanner Diagnose ===');

// 1. Prüfe verfügbare APIs
console.log('\n1. API-Verfügbarkeit:');
console.log('- navigator.mediaDevices:', !!navigator.mediaDevices);
console.log('- getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
console.log('- enumerateDevices:', !!navigator.mediaDevices?.enumerateDevices);

// 2. Prüfe Bibliotheken
console.log('\n2. Bibliotheks-Verfügbarkeit:');
console.log('- jsQR:', typeof jsQR !== 'undefined' ? '✅ Verfügbar' : '❌ Nicht verfügbar');
console.log('- ZXing:', typeof ZXing !== 'undefined' ? '✅ Verfügbar' : '⚠️ Optional nicht verfügbar');
console.log('- electronAPI:', typeof window.electronAPI !== 'undefined' ? '✅ Verfügbar' : '❌ Nicht verfügbar');

// 3. Prüfe DOM-Elemente
console.log('\n3. DOM-Elemente:');
const elements = ['video', 'result', 'cameraSelect', 'settingsBtn'];
elements.forEach(id => {
  const element = document.getElementById(id);
  console.log(`- ${id}:`, element ? '✅ Gefunden' : '❌ Nicht gefunden');
});

// 4. Teste Kamera-Zugriff
console.log('\n4. Kamera-Test:');
if (navigator.mediaDevices?.getUserMedia) {
  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      const cameras = devices.filter(device => device.kind === 'videoinput');
      console.log(`- Verfügbare Kameras: ${cameras.length}`);
      cameras.forEach((camera, index) => {
        console.log(`  ${index + 1}. ${camera.label || 'Unbekannte Kamera'} (${camera.deviceId})`);
      });
      
      if (cameras.length > 0) {
        return navigator.mediaDevices.getUserMedia({ video: true });
      } else {
        throw new Error('Keine Kameras gefunden');
      }
    })
    .then(stream => {
      console.log('- Kamera-Zugriff: ✅ Erfolgreich');
      stream.getTracks().forEach(track => track.stop());
      
      // 5. Teste Canvas-Support
      console.log('\n5. Canvas-Test:');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      console.log('- Canvas-Support:', context ? '✅ Verfügbar' : '❌ Nicht verfügbar');
      
      console.log('\n=== Diagnose abgeschlossen ===');
      console.log('✅ App sollte funktionsfähig sein!');
    })
    .catch(error => {
      console.log('- Kamera-Zugriff: ❌ Fehler -', error.message);
      console.log('\n=== Diagnose mit Fehlern abgeschlossen ===');
      console.log('⚠️ Kamera-Berechtigungen prüfen!');
    });
} else {
  console.log('- Kamera-API: ❌ Nicht unterstützt');
}

// Export für manuellen Aufruf
window.runDiagnose = () => {
  console.clear();
  eval(document.currentScript.textContent);
};
