# Copilot Instructions for Creative Coding Showcase

## Project Overview
- **Creative Coding Showcase** is an Electron app for displaying p5.js sketches, designed for both desktop and Raspberry Pi-based creative coding cabinets.
- The app supports importing sketches, gallery navigation, and custom hardware integration (arcade buttons, camera modules).

## Architecture & Key Components
- **Electron Main Process**: `src/main.js` handles app lifecycle, sketch import logic, config management, and communication with renderer.
- **Preload Script**: `src/preload.js` exposes a secure API (`electronAPI`) for renderer processes to interact with Electron IPC.
- **Renderer/UI**: HTML/CSS/JS in `src/html/` (gallery, import flow, showcase display). p5.js is used for sketch rendering.
- **Sketch Import**: Import logic expects sketches to follow conventions (see below) and updates `_links.json` for gallery integration.
- **Config Files**: User/system config in `config.json` (see README for location and options). Sketch metadata in `_links.json`.
- **Raspberry Pi Integration**: Scripts in `scripts/` automate setup, hardware config, and startup (see `arcade-bonnet.sh`, `start_cabinet.sh`).

## Developer Workflows
- **Install & Run**: `npm install` then `npm start` (see README for details).
- **Build/Package**: `npm run make` to create distributable packages (see `out/` directory).
- **Raspberry Pi Deploy**: Use scripts in `scripts/` and follow `Raspberry-Pi-set-up.md` for hardware and OS setup.
- **Config Editing**: Start app once to generate config, then edit `config.json` in user/system config directory.
- **Debugging**: Enable dev tools via `config.json` (`devTools: true`).

## Project-Specific Conventions
- **Sketch Constraints**: Sketches must not use ESC, CTRL+ALT+1, or CTRL+ALT+3 (reserved for app navigation and system shortcuts).
- **_links.json Format**: Each sketch entry must include keys: `cabinet`, `documentation`, `instructions`, `sketch`, `thumb`, `found_all_files`, `missing_files`, `is_buggy`, `has_confirmed`, `first_name`, `last_name`.
- **Import Flow**: Import expects `index.html`, `instructions.txt`, documentation (PDF/Word), and thumbnail image. Missing files are tracked in `missing_files`.
- **Hardware Setup**: Scripts automate enabling I2C, configuring GPIO, and setting up arcade bonnet hardware. See `arcade-bonnet.sh` and DEV_NOTES.md for troubleshooting.
- **Keyboard Shortcuts**: CTRL (left), ALT (right), ESC (exit sketch). See README for full table.

## Integration Points
- **IPC Communication**: Use `electronAPI` in renderer for all main/renderer interactions.
- **External Dependencies**: p5.js, p5.sound, Electron, Node.js (see `package.json`).
- **Custom Hardware**: Integration via shell scripts and Python (`arcadeBonnet.py`).

## Key Files & Directories
- `src/main.js`, `src/preload.js`: Electron logic and IPC.
- `src/html/`: UI, gallery, import flow, sketch rendering.
- `scripts/`: Raspberry Pi and hardware setup scripts.
- `README.md`, `Raspberry-Pi-set-up.md`, `DEV_NOTES.md`: Developer guides and hardware notes.
- `config.json`, `_links.json`: App and sketch configuration.

## Example: _links.json Entry
```json
{
  "sketch_one": {
    "first_name": "Jana",
    "last_name": "Scrip",
    "has_confirmed": false,
    "cabinet": "dewey",
    "documentation": "sketch-one/creative-sketch-process.pdf",
    "instructions": "sketch-one/README.txt",
    "sketch": "sketch-one/sketch.html",
    "thumb": "sketch-one/images/thumb.png",
    "found_all_files": true,
    "missing_files": [],
    "is_buggy": false
  }
}
```

## References
- See `README.md` for installation, configuration, and sketch constraints.
- See `Raspberry-Pi-set-up.md` and `DEV_NOTES.md` for hardware and deployment notes.
- See `scripts/` for automation and hardware setup.

---
**Feedback:** Please review and suggest additions or clarifications for any unclear or incomplete sections.