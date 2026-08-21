# Cloud Dial Studio

<img width="2558" height="1306" alt="Screenshot 2026-07-25 125028" src="https://github.com/user-attachments/assets/d242d4f5-b335-43f2-9dd2-67ac6056b9fc" />

A browser-based watch face editor written in TypeScript for IDO smartwatches powered by Actions MCU platforms.

Cloud Dial Studio allows users to create, edit, preview, and export custom watch faces using the IDO watch face format.

## Notice
After looking further, the IDB03 actually uses the watch_15 widget, but not watch widget. Use the watch widget for IDB03 at your own risk.

## Features

* Browser-based watch face editing
* Interactive watch preview renderer
* IDO `.iwf` project support
* Custom image-based font rendering
* Clock hand editing with anchor and rotation support
* Widget-based watch face design
* `iwf.json` and `font.json` compatibility
* Watch face preview generation
* Exportable watch face packages

## Supported Devices

Currently supported:

### Smartwatches:
* IDW13
* IDW18
* IDW20

### Smartbands:
* IDB03

Additional Actions MCU-based IDO smartwatch models (e.g. IDSport03) may be supported in future releases.

## Watch faces made with Cloud Dial Studio
### petsim1 (IDW13) (Pet Simulator 99 Watch Face)
<img width="174" height="196" alt="preview_idw13" src="https://github.com/user-attachments/assets/69599058-4ecf-4055-ad2d-4675787d4741" />

### petsim1 (IDB03) (Pet Simulator 99 Watch Face)
<img width="154" height="240" alt="preview_idb03" src="https://github.com/user-attachments/assets/fbf35557-d094-43b8-b052-94ef2c2b1dcd" />

## Known Issues

The widget rendering system is still being improved, so expect issues:

* Hour widget may not have a zero

## Packing Watch Faces
Cloud Dial Studio does not support compiling watch faces into a binary format (.iwf). To pack a watch face into an .iwf file, you must install these files/packages first:

* Python 3.11 or higher (With "Add to PATH" enabled)
* Pillow (pip install pillow)

Usage: `python iwf_packer.py INPUT_FOLDER OUTPUT_FILE`

<img width="1357" height="1204" alt="Untitled - July 20, 2026 at 17 30 03" src="https://github.com/user-attachments/assets/2b3b544f-239e-49ea-8bd2-b181912f8b56" />

## Important Notes
* Ring widgets, Progressbar widgets, and some custom widgets are not supported yet. They will be added once reverse-engineered further.
* IDO Smartwatches or Smartbands with Sifli MCUs are NOT compatible with this editor since they use an encrypted format `.watch`.

## About

Cloud Dial Studio is designed to provide a modern, browser-based workflow for creating watch faces for IDO smartwatches using web technologies without complex installations of Python, C++, or other coding languages.

The project focuses on compatibility with Actions MCU-based IDO devices while providing a more accessible alternative to traditional watch face creation tools.
