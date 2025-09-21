/*
 * Main entry point for an electron app for a 'Creative Coding Showcase'. Not
 * really much beyond a boilerplate 'getting started' electron app.
 *
 * Jared Donovan 2024
 */

const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron")
const path = require("path")
const fs = require("fs")
const { Readable } = require("stream")
const { finished } = require("stream/promises")

const CRC32 = require("crc-32")

// In your Electron app's main or renderer process
console.log("chrome version: ", process.versions.chrome)

// Main window for the app. This will be instantiated by `createWindow()`
let mainWindow = null

const defaultTitle = "Creative Coding Showcase"
let currentName = ""

// Read version from package.json so it works from both npx and npm
const appPkg = require(path.join(__dirname, "../package.json"))
const pkgVersion = appPkg.version

// Set the name of the app explicitly so importing config files works
// equivalently whether using `npm start` or `npx electron src/main.js`
app.setName("creative-coding-showcase")

// Store a list of all the IDs that have been generated while the app has
// been running. This will be overwritten by data from a file read in once 
// config is loaded.
let importCodes = []

// A list of all the ids we have permitted to import sketches. 
// This will be overwritten by data from a file read in once config is loaded.
let permittedImportIds = {
  all: [],
  byId: {}
}

// Look for a config file in the user's default application data folder
let userDataPath = app.getPath("userData")
console.log({ userDataPath })
let configPath = path.join(userDataPath, "config.json")

// Look for a config file in the documents directory
if (!fs.existsSync(configPath)) {
  // Get the default path for the location of the sketches directory
  let documentsPath = app.getPath("documents")
  let defaultSketchesPath = path.join(
    documentsPath, "creative-coding-showcase", "sketches")

  console.log("defaultSketchesPath:", defaultSketchesPath)

  // Default configuration options. 
  const defaultOpts = {
    version: pkgVersion,
    cabinetName: "test",
    width: 1240,
    height: 800,
    fullscreen: false,
    debounceTime: 100,
    fixCss: true,
    devTools: true,
    sketchesPath: defaultSketchesPath,
    allowP5jsImports: false,
    importsUrl: "http://0.0.0.0/imports",
    importPollRate: 60000,
    permittedImportIdsPath: `${defaultSketchesPath}/_permittedImportIds.json`,
    hideCursor: true,
    showSketchDropdown: false
  }

  // Other commonly used dimensions. 1920 x 1080, 1280 x 720

  console.log("Config file does not exist => creating.")
  fs.writeFileSync(configPath,
    JSON.stringify(defaultOpts, undefined, 2), { encoding: "utf8" })
} else {
  let documentsPath = app.getPath("documents")
  let defaultSketchesPath = path.join(
    documentsPath, "creative-coding-showcase", "sketches")

  console.log("defaultSketchesPath:", defaultSketchesPath)
}

// Read the configuration file in.
console.log(`Reading config file from:\n\t${configPath}`)
let cmdOpts = JSON.parse(fs.readFileSync(configPath, { encoding: "utf8" }))

// Check that the version recorded in the configuration file matches the app
// version and issue a warning if not.
if (cmdOpts.version != pkgVersion) {
  console.log(
    `\nWARNING: Configuration version does not match app version: config:${cmdOpts.version} => app:${pkgVersion
    }\n`)
}
cmdOpts.version = pkgVersion

// Add a blank _links.json file for the showcase sketches 
if (!fs.existsSync(`${cmdOpts.sketchesPath}/_links.json`)) {
  fs.writeFileSync(`${cmdOpts.sketchesPath}/_links.json`,
    JSON.stringify({}, undefined, 4), { encoding: "utf-8", recursive: true })
}

// Read / create _links.json and _importCodes.json files if imports are to be
// allowed. 
if (cmdOpts.allowP5jsImports) {
  if (!fs.existsSync(`${cmdOpts.sketchesPath}/_imports`)) {
    fs.mkdirSync(`${cmdOpts.sketchesPath}/_imports/`, { recursive: true })
  }

  if (!fs.existsSync(`${cmdOpts.sketchesPath}/_imports/_links.json`)) {
    fs.writeFileSync(`${cmdOpts.sketchesPath}/_imports/_links.json`,
      JSON.stringify({}, undefined, 4), { encoding: "utf-8", recursive: true }
    )
  }

  importCodes = loadImportCodes() || importCodes
  saveImportCodes()
}

// Load import codes from file
function loadImportCodes() {
  let importCodesFromFile = null

  if (fs.existsSync(`${cmdOpts.sketchesPath}/_imports/_importCodes.json`)) {
    importCodesFromFile = JSON.parse(fs.readFileSync(
      `${cmdOpts.sketchesPath}/_imports/_importCodes.json`,
      { encoding: "utf8" })
    )
  }

  return importCodesFromFile
}

// Save the import codes to file
function saveImportCodes() {
  if (!fs.existsSync(`${cmdOpts.sketchesPath}/_imports`)) {
    fs.mkdirSync(`${cmdOpts.sketchesPath}/_imports/`, { recursive: true })
  }
  fs.writeFileSync(`${cmdOpts.sketchesPath}/_imports/_importCodes.json`,
    JSON.stringify(importCodes, undefined, 4),
    { encoding: "utf-8", recursive: true }
  )
}

// Handler to provide the options that the app is running with. This allows
// the showcase.js app to access the config/command-line options.
function handleGetOpts() {
  return cmdOpts
}

// This function will generate a new id for use to request a p5js sketch be
// imported. Used by the 'import' sketch.js page.
function handleGenerateImportCode() {
  console.log("handleGenerateImportCode()")
  let rawCode = Date.now() + ""
  let newImportCode = (CRC32.str(rawCode, 0) >>> 0).toString(32)

  importCodes.push({
    code: newImportCode,
    isImported: false,
    createdAt: new Date().toString()
  })

  saveImportCodes()

  return newImportCode
}

const createWindow = () => {
  // Get any relevant boolean command-line arguments that were provided and
  // overwrite the values read from the configuration.
  // Set like this: `npx electron src/main.js --fullScreen=true`
  for (let boolOpt of [
    "fullscreen", "devTools", "fixCss", "allowP5jsImports",
    "hideCursor", "showSketchDropdown"
  ]) {
    if (app.commandLine.hasSwitch(boolOpt)) {
      let optVal = app.commandLine.getSwitchValue(boolOpt)
      cmdOpts[boolOpt] = optVal === "true"
    }
  }

  // Get any relevant integer command-line arguments that were provided and
  // overwrite the values read from the configuration.
  // Set like this: `npx electron src/main.js --width=400`
  for (let intOpt of ["width", "height", "debounceTime", "importPollRate"]) {
    if (app.commandLine.hasSwitch(intOpt)) {
      let optVal = Number.parseInt(app.commandLine.getSwitchValue(intOpt))
      if (!isNaN(optVal)) {
        cmdOpts[intOpt] = optVal
      }
    }
  }

  // Get any relevant string command-line arguments that were provided and
  // overwrite the values read from the configuration.
  // Set like this: `npx electron src/main.js --cabinetName=test`
  for (let strOpt of [
    "cabinetName", "sketchesPath", "importsUrl", "permittedImportIdsPath"
  ]) {
    if (app.commandLine.hasSwitch(strOpt)) {
      let optVal = app.commandLine.getSwitchValue(strOpt)
      cmdOpts[strOpt] = optVal
    }
  }

  // Read in the permittedImportIdsPath if appropriate
  if (cmdOpts.allowP5jsImports
    && fs.existsSync(cmdOpts.permittedImportIdsPath)) {
    console.log(
      `Reading permitted import ids from:\n\t${cmdOpts.permittedImportIdsPath}`)
    permittedImportIds = JSON.parse(
      fs.readFileSync(cmdOpts.permittedImportIdsPath, "utf8"))
  }

  // Print out the cmdOpts so we can check that we're getting what we expect.
  console.log("creating window with cmdOpts:\n", cmdOpts)

  mainWindow = new BrowserWindow({
    title: defaultTitle,
    icon: "images/cabinet-128.png",
    width: cmdOpts.width,
    height: cmdOpts.height,
    fullscreen: cmdOpts.fullscreen,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  })

  // TODO: Set kiosk mode to true if we're in fullscreen mode.
  //       Kiosk mode is poorly documented in electron, so this requires
  //       further investigation, see:
  //       <https://github.com/electron/electron/issues/31860>
  //       <https://medium.com/@andreas.schallwig/building-html5-kiosk-applications-with-vue-js-and-electron-c64ac928b59f>
  //
  // if (cmdOpts.fullscreen){
  //   mainWindow.setKiosk(true);
  // }

  // Handler to allow the showcase.js client to set the name of the window
  // based on which sketch is currently showing.
  ipcMain.on("set-name", handleSetName)

  function handleSetName(event, nameData) {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    currentName = nameData.name
    console.log("set currentName:", currentName)
    mainWindow.setTitle(nameData.displayName)
  }

  // Function to check for new imports. This should happen periodically and each
  // time that a new import is found, it should launch a process to load that
  // import into the sketch.
  const checkForImports = async () => {  // Get filtered json
    // This variable is going to hold on to any import update info we need to
    // send. We will send it at the end of the function
    let importUpdates = { log: [] }

    console.log("checkForImports()")
    // importUpdates.log.push("Checking for imports")

    const listImportsUrl =
      `${cmdOpts.importsUrl}/index.php?c=${cmdOpts.cabinetName}`

    let json
    try {
      console.log("before fetch: listImportsUrl")
      let res = await fetch(listImportsUrl, { signal: AbortSignal.timeout(5000) })
      console.log("after fetch")
      json = await res.json()

      console.log(`..got import json with ${json.length} items`)

      // Only pay attention to import requests we have a recorded code for
      // (i.e., ones we generated on this app during this run.)
      let validJson = filterImportJson(json)

      console.log(`..got validJson with ${validJson.length} items`)

      let importJson = {}

      for (let validEntry of validJson) {
        importUpdates.log.push(
          `Importing (importCode): ${validEntry.import_code}`,
          `Started import at ${new Date().toTimeString().split(" ")[0]}`
        )

        let [newId, newJson, logMsgs] = await importSketch(validEntry)

        importUpdates.log.push(logMsgs)

        importJson[newId] = newJson
        addEntryToImportLinksJson(newId, newJson)

        // Record that the import code has been used.
        let usedImportCode = validEntry.import_code

        importCodes = importCodes.map(ic => {
          return {
            code: ic.code,
            isImported: ic.code === usedImportCode ? true : ic.isImported,
            createdAt: ic.createdAt
          }
        })
      }

      importUpdates.importCodes = importCodes

      saveImportCodes()

      mainWindow.webContents.send("import-sketch", importJson)

    } catch (err) {
      console.log("checkForImports error", err.name)
      importUpdates.log.push(
        `Error fetching imports from ${listImportsUrl}:
  Error.name:    ${err.name}
       .message: ${err.message}
       .cause:   ${err.cause}`, "test1", "test2"
      )
    }

    console.log(
      `rescheduling import poll for ${Math.ceil(cmdOpts.importPollRate / 1000)}s`)

    importUpdates.msToImport = cmdOpts.importPollRate
    mainWindow.webContents.send("import-info", importUpdates)

    setTimeout(checkForImports, cmdOpts.importPollRate)
  }
  if (cmdOpts.allowP5jsImports) {
    checkForImports()
  }

  // Watch for ESC key events so that we can cancel the currently running
  // sketch and return to the showcase.
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type == "keyDown" && input.key === "Escape") {
      mainWindow.webContents.send("back")
    }
  })

  // If the configuration has been set to allow imports from p5js, launch a
  // timeout to check for new urls to import.
  // if (cmdOpts.allowP5jsImports){
  //   setTimeout(checkForImports, 1000)
  // }

  // TODO: Looking at the idle time might allow for an autonomous animation to
  //       load and run if the cabinets have been quiet for a while.
  //       See below for the commented out function 'reportIdleTime'
  // setTimeout(reportIdleTime, 1000)

  // Set up the menu for the app. This is most useful for when running in 
  // windowed mode. It allows access to some extra functions such as capturing 
  // a screen shot of the currently running sketch.
  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        {
          click: () => mainWindow.webContents.send("next-sketch"),
          label: "Next Sketch",
        },
        {
          click: () => mainWindow.webContents.send("prev-sketch"),
          label: "Previous Sketch",
        },
        {
          click: () => mainWindow.webContents.send("select"),
          label: "Select",
        },
        {
          click: () => mainWindow.webContents.send("back"),
          label: "Back",
        },
        {
          click: checkForImports,
          label: "Check Imports",
        },
        {
          role: "reload"
        },
        {
          role: "toggleDevTools"
        },
        {
          role: "quit",
          label: "Quit",
        },
      ]
    }
  ])

  Menu.setApplicationMenu(menu)

  // Load the showcase src file as our application page.
  mainWindow.loadFile(path.join(__dirname, "html/showcase.html"))

  // Show the chromium dev tools if that has been requested. 
  if (cmdOpts.devTools) {
    mainWindow.webContents.openDevTools()
  }

  // Prevent the app from opening the URL in-app, instead open in browser.
  // TODO: I should lock this down for the final app so that it just doesn't 
  //       open at al. 
  mainWindow.webContents.setWindowOpenHandler((details) => {
    console.log("webContents.windowOpenHandler() details:", details.url)

    shell.openExternal(details.url)
    return { action: "deny" }
  })

}

// Function to filter json list returned by request to importUrl/index.php
// so that it only includes entries that we have generated the import code for
// and that come from a permitted user id on our list of ids.
function filterImportJson(json) {
  console.log(`filterImportJson() json: ${json.length} items`)

  // First filter by valid import codes.
  let validJson = json.filter(
    je => importCodes.filter(ie => !ie.isImported).map(ie => ie.code)
      .includes(je.import_code)
  )

  let numValidCodes = validJson.length
  if (numValidCodes < json.length) {
    console.log(`..there were ${json.length - numValidCodes} invalid codes`)
  }

  // Also only pay attention to import requests we have explicitly permitted a
  // user to make
  validJson = validJson.filter(
    ve => permittedImportIds.all.includes(ve.id_hash)
  )

  let numPermitted = validJson.length
  if (numPermitted < numValidCodes) {
    console.log(`..there were ${numValidCodes - numPermitted} not permitted`)
  }

  return validJson
}

async function importSketch(importJson) {
  console.log("importSketch(), importJson:", importJson)

  let sketchId = importJson.sketch_url.split("/").pop()
  let sketchUser = importJson.sketch_url.split("/")[3]
  let userName = permittedImportIds.byId[importJson.id_hash].name
  let pathRoot = `_imports/${userName.replace(/\s+/g, "_")}/${sketchId}`
  let fullPathRoot = `${cmdOpts.sketchesPath}/${pathRoot}`

  let logMsgs = [
    `sketchId: ${sketchId}`,
    `p5jsUser: ${sketchUser}`,
    `userName: ${userName}`
  ]

  console.log("..sketchId:", sketchId)

  // Check if a previous import already exists
  if (fs.existsSync(fullPathRoot)) {
    console.log("..Removing previous import directory:", pathRoot)
    logMsgs.push(`..Removing previous import directory: ${pathRoot}`)
    fs.rmSync(fullPathRoot, { recursive: true, force: true })
  }

  const sketchJsonUrl =
    `https://editor.p5js.org/editor/${sketchUser}/projects/${sketchId}`

  let res = await fetch(sketchJsonUrl)
  let json = await res.json()

  // Shape the data into a more convenient format. 
  let paths = {
    all: [],
    atPath: {},
    byId: {}
  }

  // First, iterate and add all the ids and entries.
  for (let p of json.files) {
    paths.all.push(p._id)
    paths.byId[p._id] = p
  }

  // Next go through and add information about who is the parent.
  for (let p of json.files) {
    for (let cId of p.children) {
      paths.byId[cId].parent = p._id
    }
  }

  // Function to recursively rebuild the paths
  function getBasePathRecursive(id, lvls) {
    const { name, parent } = paths.byId[id]
    if (parent) {
      return `${getBasePathRecursive(parent, lvls + 1)}/${lvls > 0 ? name : ""}`
    } else {
      return `${pathRoot}/${lvls > 0 ? name : ""}`
    }
  }

  // Now reconstruct the path and create files / folders
  for (let id of paths.all) {
    let p = paths.byId[id]
    p.basePath = getBasePathRecursive(id, 0)
    p.path = `${p.basePath}/${p.name}`

    // Also record all the items at a given path. Makes it easier to 
    // guess which should be the entry point for example.
    if (Object.hasOwn(paths.atPath, p.basePath)) {
      paths.atPath[p.basePath].push({ name: p.name, id: p.id })
    } else {
      paths.atPath[p.basePath] = [{ name: p.name, id: p.id }]
    }

    if (p.fileType === "folder") {
      createImportFolder(p.path)
    } else if (p.url) {
      await downloadFile(p.path, p.url)
    } else {
      createFileWithContent(p.path, p.content)
    }
  }

  // Figure out where the important files are. I will expect them all to be
  // in the root directory.
  let rootFilesPath = `${pathRoot}/root/`
  let rootFiles = paths.atPath[rootFilesPath]
  let missingFiles = []

  let documentationFile = rootFilesPath
  let wordFiles = rootFiles.filter(e => e.name.match(/\.docx?$/i))
  let pdfFiles = rootFiles.filter(e => e.name.match(/\.pdf$/i))
  if (pdfFiles.length > 0) {
    documentationFile = `${rootFilesPath}${pdfFiles[0].name}`
  } else if (wordFiles.length > 0) {
    documentationFile = `${rootFilesPath}${wordFiles[0].name}`
  } else {
    documentationFile = rootFilesPath
    missingFiles.push("documentation")
  }

  let instructionsFile = `${rootFilesPath}instructions.txt`
  if (rootFiles.indexOf(e => e.name === "instructions.txt") == -1) {
    let txtFiles = rootFiles.filter(e => e.name.match(/\.txt$/i))
    if (txtFiles.length > 0) {
      instructionsFile = `${rootFilesPath}${txtFiles[0].name}`
    } else {
      instructionsFile = rootFilesPath
      missingFiles.push("instructions")
    }
  }

  let sketchFile = `${rootFilesPath}index.html`
  if (rootFiles.indexOf(e => e.name === "index.html") == -1) {
    let otherHtmlFiles = rootFiles.filter(e => e.name.match(/\.html$/i))
    if (otherHtmlFiles.length > 0) {
      sketchFile = `${rootFilesPath}${otherHtmlFiles[0].name}`
    } else {
      sketchFile = rootFilesPath
      missingFiles.push("sketch")
    }
  }

  let thumbFile = `${rootFilesPath}thumb.png`
  if (rootFiles.indexOf(e => e.name === "thumb.png") == -1) {
    let pngFiles = rootFiles.filter(e => e.name.match(/\.png?$/i))
    let jpgFiles = rootFiles.filter(e => e.name.match(/\.jpe?g$/i))
    if (pngFiles.length > 0) {
      thumbFile = `${rootFilesPath}${pngFiles[0].name}`
    } else if (jpgFiles.length > 0) {
      thumbFile = `${rootFilesPath}${jpgFiles[0].name}`
    } else {
      thumbFile = rootFilesPath
      missingFiles.push("thumb")
    }
  }

  let id = `${userName}-${sketchId}`.replace(/\s+/gi, "_")
  let newJson = {
    cabinet: cmdOpts.cabinetName,
    found_all_files: missingFiles.length == 0,
    has_confirmed: true,
    is_buggy: false,
    missing_files: missingFiles,
    documentation: documentationFile,
    first_name: userName.split(" ")[0],
    last_name: userName.split(" ").pop(),
    instructions: instructionsFile,
    sketch: sketchFile,
    thumb: thumbFile
  }

  return [id, newJson, logMsgs]
}

// This function will add an entry to the _links.json for the _import folder.
// If the _links.json does not already exist, then it will be created.
const addEntryToImportLinksJson = (importId, newJson) => {
  const importLinksJsonPath = `${cmdOpts.sketchesPath}/_imports/_links.json`
  let oldImportLinksJson = {}

  if (fs.existsSync(importLinksJsonPath)) {
    let oldImportLinksStr = fs.readFileSync(
      importLinksJsonPath, { encoding: "utf-8" })
    oldImportLinksJson = JSON.parse(oldImportLinksStr)
  }

  oldImportLinksJson[importId] = newJson

  // For now, I'll just save this to file
  console.log("Writing updated import _links.json to file.")
  fs.writeFileSync(importLinksJsonPath,
    JSON.stringify(oldImportLinksJson, undefined, 4), { encoding: "utf-8" })
}

const createImportFolder = (path) => {
  console.log("creating import folder.")
  fs.mkdirSync(`${cmdOpts.sketchesPath}/${path}`, { recursive: true })
}

const createFileWithContent = (path, content) => {
  console.log("creating file with content.")
  fs.writeFileSync(`${cmdOpts.sketchesPath}/${path}`, content)
}

const downloadFile = async (path, url) => {
  console.log("downloading:", url)

  const res = await fetch(url)
  const fileStream = fs.createWriteStream(
    `${cmdOpts.sketchesPath}/${path}`, { flags: "wx" })
  await finished(Readable.fromWeb(res.body).pipe(fileStream))
}

app.whenReady().then(() => {
  ipcMain.handle("get-opts", handleGetOpts)
  ipcMain.handle("generate-import-code", handleGenerateImportCode)

  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
