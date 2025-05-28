// barcode-support.js
// Erweiterte Barcode-Unterstützung als optionale Erweiterung

class BarcodeSupport {
  constructor() {
    this.zxingReader = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Versuche ZXing zu laden, falls verfügbar
      if (typeof ZXing !== 'undefined') {
        this.zxingReader = new ZXing.BrowserMultiFormatReader();
        this.initialized = true;
        console.log('ZXing Multi-Format Reader initialisiert');
        return true;
      }
    } catch (e) {
      console.warn('ZXing konnte nicht initialisiert werden:', e);
    }
    return false;
  }

  async scanBarcode(imageData) {
    if (!this.initialized || !this.zxingReader) {
      return null;
    }

    try {
      const result = await this.zxingReader.decodeFromImageData(imageData);
      if (result) {
        return {
          text: result.getText(),
          format: result.getBarcodeFormat()
        };
      }
    } catch (e) {
      // Kein Barcode gefunden, normal
    }
    return null;
  }

  getSupportedFormats() {
    if (this.initialized) {
      return ['QR_CODE', 'CODE_128', 'EAN_13', 'CODE_39', 'UPC_A'];
    }
    return ['QR_CODE'];
  }
}

// Exportiere für den Renderer
window.BarcodeSupport = BarcodeSupport;
