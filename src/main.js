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

const defaultTitle = "Creative Coding Showcase"
let currentName = ""

// Store a list of all the IDs that have been generated while the app has
// been running. 
// TODO: The initialization data below is just for testing.
let importCodes = [
  {code: "3ubqgkg", isImported: false}
]

// A list of all the ids we have permitted to import sketches. 
// This will be overwritten by data from a file read in once config is loaded.
let permittedImportIds = {
  all: [],
  byId: {}
}

// Look for a config file in the user's default application data folder
let userDataPath = app.getPath("userData")
let configPath = path.join(userDataPath, "config.json")

// Look for a config file in the documents directory
if (!fs.existsSync(configPath)){
  // Get the default path for the location of the sketches directory
  let documentsPath = app.getPath("documents")
  let defaultSketchesPath  = path.join(
    documentsPath, "creative-coding-showcase", "sketches")

  // console.log("defaultSketchesPath:", defaultSketchesPath)

  // Default configuration options. 
  const defaultOpts = {
    version: app.getVersion(),
    cabinetName: "test",
    width: 1440,
    height: 900,
    fullscreen: false,
    debounceTime: 100,
    fixCss: true,
    devTools: true,
    sketchesPath: defaultSketchesPath,
    allowP5jsImports: false,
    importsUrl: "http://0.0.0.0/imports",
    permittedImportIdsPath: `${defaultSketchesPath}/_permittedImportIds.json`,
    hideCursor: true,
  }

  // Other commonly used dimensions.
  //
  // width: 1920,
  // height: 1080,
  //
  // width: 1280,
  // height: 720,

  console.log("Config file does not exist => creating.")
  fs.writeFileSync(configPath, JSON.stringify(defaultOpts, null, 2), "utf8")
}

// Read the configuration file in.
console.log(`Reading config file from:\n\t${configPath}`)
let cmdOpts = JSON.parse(fs.readFileSync(configPath, "utf8"))

// Check that the version recorded in the configuration file matches the app
// version and issue a warning if not.
if (cmdOpts.version != app.getVersion()){
  console.log(
    `\nWARNING: Configuration version does not match app version: config:${
      cmdOpts.version} => app:${app.getVersion()
    }\n`)
}
cmdOpts.version = app.getVersion()

// Handler to provide the options that the app is running with. This allows
// the showcase.js app to access the config/command-line options.
function handleGetOpts() {
  return cmdOpts  
}

// This function will generate a new id for use to request a p5js sketch be
// imported. Used by the 'import' sketch.js page.
function handleGenerateImportCode() {
  let rawCode = Date.now() + ""
  let newImportCode = (CRC32.str(rawCode, 0) >>> 0).toString(32)

  importCodes.push({code: newImportCode, isImported: false})
  return newImportCode
}

const createWindow = () => {
  // Get any relevant boolean command-line arguments that were provided and
  // overwrite the values read from the configuration.
  for (let boolOpt of [
    "fullscreen", "devTools", "fixCss", "allowP5jsImports", "hideCursor"
  ]){
    if (app.commandLine.hasSwitch(boolOpt)){
      let optVal = app.commandLine.getSwitchValue(boolOpt)
      cmdOpts[boolOpt] = optVal === "true"
    }  
  }

  // Get any relevant integer command-line arguments that were provided and
  // overwrite the values read from the configuration.
  for (let intOpt of ["width", "height", "debounceTime"]){
    if (app.commandLine.hasSwitch(intOpt)){
      let optVal = Number.parseInt(app.commandLine.getSwitchValue(intOpt))
      if (!isNaN(optVal)){
        cmdOpts[intOpt] = optVal
      }
    }
  }  

  // Get any relevant string command-line arguments that were provided and
  // overwrite the values read from the configuration.
  for (let strOpt of [
    "cabinetName", "sketchesPath", "importsUrl", "permittedImportIdsPath"]){
    if (app.commandLine.hasSwitch(strOpt)){
      let optVal = app.commandLine.getSwitchValue(strOpt)
      cmdOpts[strOpt] = optVal
    }
  }

  // Read in the permittedImportIdsPath if appropriate
  if (cmdOpts.allowP5jsImports 
    && fs.existsSync(cmdOpts.permittedImportIdsPath)){
    console.log(
      `Reading permitted import ids from:\n\t${cmdOpts.permittedImportIdsPath}`)
    permittedImportIds = JSON.parse(
      fs.readFileSync(cmdOpts.permittedImportIdsPath, "utf8"))
  }

  // Print out the cmdOpts so we can check that we're getting what we expect.
  console.log("creating window with cmdOpts:\n", cmdOpts)
  
  const win = new BrowserWindow({
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
  //   win.setKiosk(true);
  // }

  // Handler to allow the showcase.js client to set the name of the window
  // based on which sketch is currently showing.
  ipcMain.on("set-name", handleSetName)

  function handleSetName (event, nameData) {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    currentName = nameData.name
    win.setTitle(nameData.displayName)
  }

  // Watch for ESC key events so that we can cancel the currently running
  // sketch and return to the showcase.
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type == "keyDown" && input.key === "Escape"){
      win.webContents.send("back")
    }
  })  

  // If the configuration has been set to allow imports from p5js, launch a
  // timeout to check for new urls to import.
  if (cmdOpts.allowP5jsImports){
    // setTimeout(checkForImports, 1000)
  }
  
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
          click: () => win.webContents.send("next-sketch"),
          label: "Next Sketch",
        },
        {
          click: () => win.webContents.send("prev-sketch"),
          label: "Previous Sketch",
        },
        {
          click: () => win.webContents.send("select"),
          label: "Select",
        },
        {
          click: () => win.webContents.send("back"),
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
  win.loadFile("src/html/showcase.html")

  // Show the chromium dev tools if that has been requested. 
  if (cmdOpts.devTools){
    win.webContents.openDevTools()  
  }

  // Prevent the app from opening the URL in-app, instead open in browser.
  // TODO: I should lock this down for the final app so that it just doesn't 
  //       open at al. 
  win.webContents.setWindowOpenHandler((details) => {
    console.log("webContents.windowOpenHandler() details:", details.url)

    shell.openExternal(details.url)
    return { action: "deny" }
  })
  
}

// TODO - Could use this as a means to launch an 'idle' animation or behavior?
// const reportIdleTime = () => {
//   console.log(powerMonitor.getSystemIdleTime())
//   setTimeout(reportIdleTime, 1000)
// }

// Function to check for new imports. This should happen periodically and each
// time that a new import is found, it should launch a process to load that
// import into the sketch.
const checkForImports = async () => {  // Get filtered json
  console.log("Checking for imports")
  // console.log("importCodes:", importCodes)

  const listImportsUrl = 
    `${cmdOpts.importsUrl}/index.php?c=${cmdOpts.cabinetName}`

  let res = await fetch(listImportsUrl)
  let json = await res.json()

  // console.log("json:", json)

  // Only pay attention to import requests we have a recorded code for
  // (i.e., ones we generated on this app during this run.)
  let validJson = json.filter(
    je => importCodes.filter(ie => !ie.isImported).map(ie => ie.code)
      .includes(je.import_code)
  )
  // Also only pay attention to import requests we have explicitly permitted a
  // user to make
  validJson = validJson.filter(
    ve => permittedImportIds.all.includes(ve.id_hash)
  )

  for (let importJson of validJson) {
    importSketch(importJson)    
  }

  // setTimeout(checkForImports, 10000)
}

const importSketch = async (importJson) => {
  // console.log("importSketch:", importJson)

  let sketchId = importJson.sketch_url.split("/").pop()
  let sketchUser = importJson.sketch_url.split("/")[3]
  let userName = permittedImportIds.byId[importJson.id_hash].name
  let pathRoot = `${cmdOpts.sketchesPath}/_imports/${userName}/${sketchId}`

  // Check if a previous import already exists
  if (fs.existsSync(pathRoot)){
    console.log("Removing previous import directory:", pathRoot)
    fs.rmSync(pathRoot, {recursive: true, force: true})
  }

  const sketchJsonUrl =
    `https://editor.p5js.org/editor/${sketchUser}/projects/${sketchId}`
  
  let res = await fetch(sketchJsonUrl)
  let json = await res.json()

  // Shape the data into a more convenient format. 
  let paths = {
    all: [],
    byPath: {},
    byId: {} 
  }

  // First, iterate and add all the ids and entries.
  for (let p of json.files){
    paths.all.push(p._id)
    paths.byId[p._id] = p
  }

  // Next go through and add information about who is the parent.
  for (let p of json.files){
    for (let cId of p.children){
      paths.byId[cId].parent = p._id
    }
  }

  // Function to recursively rebuild the paths
  function getPathRecursive(id){
    const {name, parent} = paths.byId[id]
    if (parent){
      return `${getPathRecursive(parent)}/${name}`
    } else {
      return `${pathRoot}/${name}`
    }
  }

  // Now reconstruct the path and create files / folders
  for (let id of paths.all){
    let p = paths.byId[id]
    p.path = getPathRecursive(id)
    paths.byPath[p.path] = id

    if (p.fileType === "folder"){
      createImportFolder(p.path)
    } else if (p.url){
      await downloadFile(p.path, p.url)
    } else {
      createFileWithContent(p.path, p.content)
    }
  }

  // Finally, we need to add an entry for the imported file to the json in
  //  `imports` folder and tell the javascript showcase to add it.

}

const createImportFolder = (path) => {
  console.log("creating import folder:", path)
  fs.mkdirSync(path, {recursive: true})
}

const createFileWithContent = (path, content) => {
  console.log("creating file with content", path)
  fs.writeFileSync(path, content)
}

const downloadFile = async (path, url) => {
  console.log("downloading:", path, url)

  const res = await fetch(url)
  const fileStream = fs.createWriteStream(path, { flags: "wx" })
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
