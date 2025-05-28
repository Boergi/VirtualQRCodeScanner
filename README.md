# Virtual QRCode Scanner

Ein Electron-basierter QR-Code/Barcode-Scanner für Windows und macOS, der live Kamera-Feeds scannt und erkannte Codes automatisch in das aktive Fenster tippt.

## Features

- **Live Kamera-Scanning**: Echtzeiterfassung von QR-Codes und Barcodes
- **Multi-Format-Unterstützung**: QR-Codes, Code128, EAN13, Code39, UPC
- **Automatische Tastatur-Emulation**: Tippt erkannte Codes direkt ins aktive Fenster
- **Kamera-Auswahl**: Dropdown zur Auswahl verfügbarer Kameras
- **Tray-Integration**: Läuft im Hintergrund mit System Tray Icon
- **Einstellungen**: Konfiguration für Enter/Tab nach Code-Eingabe
- **Cross-Platform**: Funktioniert auf Windows und macOS

## Installation

```bash
# Dependencies installieren
npm install

# App starten
npm start
```

## Verwendung

1. **App starten**: `npm start`
2. **Kamera auswählen**: Dropdown-Menü zur Kameraauswahl
3. **Scanner aktivieren**: Kamera wird automatisch gestartet
4. **Code scannen**: QR-Code oder Barcode vor die Kamera halten
5. **Automatische Eingabe**: Erkannter Code wird getippt

## Einstellungen

- **Enter nach Code**: Drückt Enter nach der Code-Eingabe
- **Tab nach Code**: Drückt Tab nach der Code-Eingabe
- **Tray-Modus**: App läuft im Hintergrund

## Unterstützte Formate

- ✅ **QR-Codes**: Alle Text-Inhalte
- ✅ **Code128**: Alphanumerische Codes
- ✅ **EAN13**: 13-stellige Produktcodes
- ✅ **Code39**: Alphanumerische Codes (begrenzt)
- ✅ **UPC**: 12-stellige Produktcodes

## Testing

Test-Codes sind im Projekt enthalten:

```bash
# Alle Barcode-Formate testen
node generate-all-tests.js

# Test-Seite öffnen
open complete-barcode-tests.html
```

## Projektstruktur

- `main.js` – Electron Main Process, IPC, Tray
- `renderer.js` – UI, Kamera, Multi-Format-Scanning
- `preload.js` – Sichere IPC-Kommunikation
- `index.html` – Benutzeroberfläche

## Berechtigungen

### macOS
- Kamera-Berechtigung erforderlich
- Accessibility-Berechtigung für robotjs
- System Preferences → Security & Privacy → Camera
- System Preferences → Security & Privacy → Accessibility

### Windows
- Kamera-Berechtigung über Windows-Einstellungen
- Antivirus-Software könnte robotjs blockieren

## Dependencies

- `electron`: Electron Framework
- `jsqr`: QR-Code Scanning
- `@zxing/browser`: Multi-Format Barcode Scanning
- `robotjs`: Tastatur-Emulation

## Status

- ✅ **Projekt-Setup**: Vollständig konfiguriert
- ✅ **Kamera-Integration**: Funktioniert mit Auswahl
- ✅ **Multi-Format-Scanning**: QR + Barcodes
- ✅ **Tastatur-Emulation**: robotjs integriert
- ✅ **Test-Codes**: Umfassende Test-Suite
- ✅ **Cross-Platform**: Windows/macOS bereit
