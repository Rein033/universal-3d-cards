# Changelog

## 0.1.0 – 2026-10-19

First release.

- One card for Bambu Lab, Klipper (Moonraker), Creality (local ha_creality_ws and Creality Cloud), Anycubic Cloud and
  OctoPrint printers.
- Drawn printers: Bambu Lab enclosed with AMS, bed slinger (A1, Ender, Prusa), Voron / Klipper, Creality K1, Anycubic
  Kobra S1 with ACE. Picked automatically from the printer model, or set in the editor.
- The print preview grows inside the drawing with the progress, tinted in the active filament colour. The toolhead
  moves on its own layer (no repaint of the drawing), pauses off screen and respects "reduce motion".
- Live camera view (MJPEG through Home Assistant), only streaming while visible.
- Slicer info: material, layer height, layers, filament used or weight, slicer estimate, slicer. Read from the file
  name when the integration doesn't report it.
- AMS / ACE spools in their real colours, active spool outlined.
- Printer group card with all printers in one list.
- Visual editors for both cards. English and Dutch.
