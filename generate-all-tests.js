const QRCode = require('qrcode');
const JsBarcode = require('jsbarcode');
const { createCanvas } = require('canvas');
const fs = require('fs');

async function generateAllTestCodes() {
  try {
    // QR-Codes
    const qrCodes = [
      { text: 'Hello World', filename: 'test-qr-hello.png' },
      { text: 'https://github.com', filename: 'test-qr-url.png' },
      { text: '1234567890', filename: 'test-qr-numbers.png' }
    ];
    
    for (const qr of qrCodes) {
      await QRCode.toFile(qr.filename, qr.text, {
        width: 300,
        margin: 2
      });
      console.log(`QR-Code erstellt: ${qr.filename}`);
    }
    
    // Barcodes (verschiedene Formate)
    const barcodes = [
      { text: '123456789012', format: 'UPC', filename: 'test-barcode-upc.png' },
      { text: '1234567890128', format: 'EAN13', filename: 'test-barcode-ean13.png' },
      { text: 'HELLO123', format: 'CODE128', filename: 'test-barcode-code128.png' },
      { text: '12345', format: 'CODE39', filename: 'test-barcode-code39.png' }
    ];
    
    for (const barcode of barcodes) {
      try {
        const canvas = createCanvas(400, 200);
        JsBarcode(canvas, barcode.text, {
          format: barcode.format,
          width: 2,
          height: 100,
          displayValue: true
        });
        
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(barcode.filename, buffer);
        console.log(`Barcode erstellt: ${barcode.filename} (${barcode.format})`);
      } catch (e) {
        console.warn(`Fehler bei ${barcode.format}:`, e.message);
      }
    }
    
    // HTML-Test-Seite
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Vollständige Barcode/QR-Tests</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-container { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .code-image { text-align: center; margin: 10px 0; }
        img { max-width: 300px; border: 1px solid #ccc; }
        .format { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>VirtualQRCodeScanner - Vollständige Tests</h1>
    
    <h2>QR-Codes</h2>
    ${qrCodes.map(qr => `
    <div class="test-container">
        <h3>${qr.text}</h3>
        <div class="format">Format: QR-Code</div>
        <div class="code-image">
            <img src="${qr.filename}" alt="QR: ${qr.text}">
        </div>
    </div>
    `).join('')}
    
    <h2>Barcodes</h2>
    ${barcodes.map(barcode => `
    <div class="test-container">
        <h3>${barcode.text}</h3>
        <div class="format">Format: ${barcode.format}</div>
        <div class="code-image">
            <img src="${barcode.filename}" alt="${barcode.format}: ${barcode.text}">
        </div>
    </div>
    `).join('')}
    
    <div class="test-container">
        <h2>Test-Anweisungen</h2>
        <ol>
            <li>Starte die VirtualQRCodeScanner App</li>
            <li>Vergewissere dich, dass die Kamera funktioniert und das Dropdown Kameras anzeigt</li>
            <li>Teste jeden Code, indem du ihn vor die Kamera hältst</li>
            <li>Der erkannte Text sollte automatisch in das aktive Fenster getippt werden</li>
            <li>Prüfe die Einstellungen (Enter/Tab nach dem Code)</li>
        </ol>
        
        <h3>Erwartete Unterstützung:</h3>
        <ul>
            <li>✅ QR-Codes (alle Texte)</li>
            <li>✅ Code128 (alphanumerisch)</li>
            <li>✅ EAN13 (13-stellige Zahlen)</li>
            <li>✅ Code39 (alphanumerisch, begrenzt)</li>
            <li>✅ UPC (12-stellige Zahlen)</li>
        </ul>
    </div>
</body>
</html>`;
    
    fs.writeFileSync('complete-barcode-tests.html', html);
    console.log('Vollständige Test-Seite erstellt: complete-barcode-tests.html');
    
  } catch (error) {
    console.error('Fehler:', error);
  }
}

generateAllTestCodes();
