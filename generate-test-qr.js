const QRCode = require('qrcode');
const fs = require('fs');

async function generateTestQRCodes() {
  try {
    // Erstelle verschiedene Test-QR-Codes
    const testCodes = [
      { text: 'Hello World', filename: 'test-hello-world.png' },
      { text: 'https://github.com', filename: 'test-github-url.png' },
      { text: '1234567890', filename: 'test-numbers.png' },
      { text: 'TEST-BARCODE-123', filename: 'test-barcode.png' }
    ];
    
    for (const testCode of testCodes) {
      await QRCode.toFile(testCode.filename, testCode.text, {
        color: {
          dark: '#000000',  // Schwarze Module
          light: '#FFFFFF'  // Weißer Hintergrund
        },
        width: 300,
        margin: 2
      });
      console.log(`QR-Code erstellt: ${testCode.filename} (Text: ${testCode.text})`);
    }
    
    // Erstelle HTML-Seite mit allen QR-Codes
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>QR-Code Tests für VirtualQRCodeScanner</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .qr-container { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
        .qr-code { text-align: center; }
        img { max-width: 300px; }
    </style>
</head>
<body>
    <h1>QR-Code Tests</h1>
    <p>Verwende diese QR-Codes zum Testen der VirtualQRCodeScanner App:</p>
    
    ${testCodes.map(code => `
    <div class="qr-container">
        <h3>Test: ${code.text}</h3>
        <div class="qr-code">
            <img src="${code.filename}" alt="QR-Code: ${code.text}">
        </div>
        <p>Erwarteter Output: <code>${code.text}</code></p>
    </div>
    `).join('')}
    
    <div class="qr-container">
        <h3>Anweisungen:</h3>
        <ol>
            <li>Öffne die VirtualQRCodeScanner App</li>
            <li>Stelle sicher, dass die Kamera funktioniert</li>
            <li>Halte einen der QR-Codes vor die Kamera</li>
            <li>Der erkannte Text sollte automatisch getippt werden</li>
        </ol>
    </div>
</body>
</html>`;
    
    fs.writeFileSync('qr-test-page.html', html);
    console.log('Test-Seite erstellt: qr-test-page.html');
    
  } catch (error) {
    console.error('Fehler beim Erstellen der QR-Codes:', error);
  }
}

generateTestQRCodes();
