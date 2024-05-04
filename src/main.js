/*
 * Main entry point for an electron app for a 'Creative Coding Showcase'. Not
 * really much beyond a boilerplate 'getting started' electron app.
 *
 * Jared Donovan 2024
 */

const { app, BrowserWindow, Menu, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")

let currentName = ""

// Look for a config file in the user's default application data folder
let userDataPath = app.getPath("userData")
let configPath = path.join(userDataPath, "config.json")


// Look for a config file in the documents directory
if (!fs.existsSync(configPath)){
  // Get the default path for the location of the sketches directory
  let documentsPath = app.getPath("documents")
  let defaultSketchesPath  = path.join(documentsPath, "creative-coding-showcase", "sketches")

  console.log("defaultSketchesPath:", defaultSketchesPath)

  // Default configuration options
  const defaultOpts = {
    cabinetName: "test",
    width: 1440,
    height: 900,
    fullscreen: false,
    debounceTime: 100,
    fixCss: true,
    devTools: true,
    sketchesPath: defaultSketchesPath
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

// Add the version of the app to the config options.
cmdOpts.version = app.getVersion()

function handleGetOpts() {
  return cmdOpts  
}

const createWindow = () => {
  // Get any relevant command-line arguments
  for (let boolOpt of ["fullscreen", "devTools", "fixCss"]){
    if (app.commandLine.hasSwitch(boolOpt)){
      let optVal = app.commandLine.getSwitchValue(boolOpt)
      cmdOpts[boolOpt] = optVal === "true"
    }  
  }

  for (let intOpt of ["width", "height", "debounceTime"]){
    if (app.commandLine.hasSwitch(intOpt)){
      let optVal = Number.parseInt(app.commandLine.getSwitchValue(intOpt))
      if (!isNaN(optVal)){
        cmdOpts[intOpt] = optVal
      }
    }
  }  

  for (let strOpt of ["cabinetName", "sketchesPath"]){
    if (app.commandLine.hasSwitch(strOpt)){
      let optVal = app.commandLine.getSwitchValue(strOpt)
      cmdOpts[strOpt] = optVal
    }  
  }

  // Print out the cmdOpts so we can check that we're getting what we expect.
  console.log("creating window with cmdOpts:\n", cmdOpts)
  
  const win = new BrowserWindow({
    title: "Creative Coding Showcase",
    icon: "images/cabinet-128.png",
    width: cmdOpts.width,
    height: cmdOpts.height,
    fullscreen: cmdOpts.fullscreen,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  })  

  // if (cmdOpts.fullscreen){
  //   win.setKiosk(true);
  // }

  function handleSetName (event, nameData) {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    currentName = nameData.name
    win.setTitle(nameData.displayName)
  }

  win.webContents.on("before-input-event", (event, input) => {
    if (input.type == "keyDown" && input.key === "Escape"){
      win.webContents.send("back")
    }
  })  
  
  ipcMain.on("set-name", handleSetName)

  // setTimeout(reportIdleTime, 1000)

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
  win.loadFile("src/html/showcase.html")

  if (cmdOpts.devTools){
    // Open the DevTools.
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
