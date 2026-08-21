# Cloud Dial Studio - Improved version of the shut down tool ATSDialFactory

<img width="2559" height="1309" alt="Screenshot 2026-08-21 161747" src="https://github.com/user-attachments/assets/464464b6-17c8-4d7d-8757-480a2e0bdee7" />

A browser-based watch face editor written in TypeScript for IDO smartwatches powered by Actions MCU platforms.

Cloud Dial Studio allows users to create, edit, preview, and export custom watch faces using the IDO watch face format.

## Notice
After looking further, older devices such as ID207, IDB03, or others use the watch_15 widget. Adding support for those watches will need to take some time.

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
* IDW17
* IDW18
* IDW20
* TIT15

### Rugged Smartwatches:
* ID Sport03

### Smartbands:
* GTBand

Additional Actions MCU-based IDO smartwatch models (e.g. ID208BT) may be supported in future releases.

## Known Issues

The background corner matcher is still being improved, so bugs may happen:

* Background Corner Matcher's image might not show up

## Packing Watch Faces
Cloud Dial Studio does not support compiling watch faces into a binary format (.iwf). To pack a watch face into an .iwf file, you must install these files/packages first:

* Python 3.11 or higher (With "Add to PATH" enabled)
* Pillow (pip install pillow)

Usage: `python iwf_packer.py INPUT_FOLDER OUTPUT_FILE`

<img width="1357" height="1204" alt="Screenshot 2026-07-20 172918" src="https://github.com/user-attachments/assets/5832f9b1-4b6f-4835-bc49-93cf471c658f" />

## Important Notes
* Ring widgets, Progressbar widgets, and some custom widgets are not supported yet. They will be added once reverse-engineered further.
* IDO Smartwatches or Smartbands with Sifli MCUs are NOT compatible with this editor since they use an encrypted format `.watch`.

## About

Cloud Dial Studio is designed to provide a modern, browser-based workflow for creating watch faces for IDO smartwatches using web technologies without complex installations of Python, C++, or other coding languages.

The project focuses on compatibility with Actions MCU-based IDO devices while providing a more accessible alternative to traditional watch face creation tools.
