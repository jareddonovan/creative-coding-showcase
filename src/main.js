/*
 * Main entry point for an electron app for a 'Creative Coding Showcase'. Not
 * really much beyond a boilerplate 'getting started' electron app.
 *
 * Jared Donovan 2024
 */

const { app, BrowserWindow, Menu, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")

const defaultTitle = "Creative Coding Showcase"
let currentName = ""

// Look for a config file in the user's default application data folder
let userDataPath = app.getPath("userData")
let configPath = path.join(userDataPath, "config.json")


// Look for a config file in the documents directory
if (!fs.existsSync(configPath)){
  // Get the default path for the location of the sketches directory
  let documentsPath = app.getPath("documents")
  let defaultSketchesPath  = path.join(
    documentsPath, "creative-coding-showcase", "sketches")

  console.log("defaultSketchesPath:", defaultSketchesPath)

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

const createWindow = () => {
  // Get any relevant boolean command-line arguments that were provided and
  // overwrite the values read from the configuration.
  for (let boolOpt of ["fullscreen", "devTools", "fixCss", "allowP5jsImports"]){
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
  for (let strOpt of ["cabinetName", "sketchesPath"]){
    if (app.commandLine.hasSwitch(strOpt)){
      let optVal = app.commandLine.getSwitchValue(strOpt)
      cmdOpts[strOpt] = optVal
    }
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

  win.webContents
}

// TODO - Could use this as a means to launch an 'idle' animation or behavior?
// const reportIdleTime = () => {
//   console.log(powerMonitor.getSystemIdleTime())
//   setTimeout(reportIdleTime, 1000)
// }

app.whenReady().then(() => {
  ipcMain.handle("get-opts", handleGetOpts)
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
