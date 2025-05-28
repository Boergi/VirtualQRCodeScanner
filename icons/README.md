# App Icons

Diese Ordner enthält alle benötigten Icons für die QR Scanner Pro App in verschiedenen Formaten und Größen.

## Dateien

### PNG-Icons (alle Plattformen)
- `icon-16x16.png` - 16x16 Pixel
- `icon-32x32.png` - 32x32 Pixel  
- `icon-48x48.png` - 48x48 Pixel
- `icon-64x64.png` - 64x64 Pixel
- `icon-128x128.png` - 128x128 Pixel
- `icon-256x256.png` - 256x256 Pixel
- `icon-512x512.png` - 512x512 Pixel
- `icon-1024x1024.png` - 1024x1024 Pixel

### Plattform-spezifische Formate
- `icon.ico` - Windows Icon (Multi-Size)
- `icon.icns` - macOS Icon Bundle
- `icon.iconset/` - macOS Icon Set Ordner

## Verwendung

Die Icons werden automatisch basierend auf der Plattform ausgewählt:
- **Windows**: `icon.ico`
- **macOS**: `icon.icns`  
- **Linux**: `icon-256x256.png`

## Tray Icons

Für das System Tray wird `icon-32x32.png` verwendet, da dies die optimale Größe für alle Plattformen ist.

## Regenerierung

Um die Icons neu zu generieren, verwende ImageMagick:

```bash
# Basis-PNG in verschiedene Größen
magick appicon.png -resize 16x16 icons/icon-16x16.png
magick appicon.png -resize 32x32 icons/icon-32x32.png
# ... etc

# Windows ICO
magick icons/icon-16x16.png icons/icon-32x32.png icons/icon-48x48.png icons/icon-256x256.png icons/icon.ico

# macOS ICNS  
iconutil -c icns icons/icon.iconset -o icons/icon.icns
```
