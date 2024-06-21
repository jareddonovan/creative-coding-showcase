/*
 * JavaScript file for the 'gallery' part of the showcase app. This is written
 * as a p5js sketch, although it doesn't use a canvas. 
 * 
 * Jared Donovan 2024.
 */

// opts needs to be declared as a 'var' so it's available 
// to child pages.
var opts = {
  debounceTime: 100
}

let showcaseJson
let importJson = {}
let selSketchCovers
let ifm
let divGallery
let divMain
let isShowingGallery = true
let selectedCoverId = null
let nextCoverIdNum = 0
let lastKp = -opts.debounceTime



/////////////////////////////////////////////////
//
// p5js 'setup' function.
//
async function setup() {
  noCanvas()

  // This select is just used as a way of conveniently recording which cover
  // is currently selected in the UI. The select element is hidden in the
  // running app, but if you uncomment the call to `hide()` below, it will be
  // visible and you can select the cover to show from there.
  selSketchCovers = createSelect()
  selSketchCovers.hide()
  selSketchCovers.parent(select("main"))
  selSketchCovers.changed(handleCoverSelectionChanged)

  divGallery = select("#gallery")
  divMain = select("main")

  window.electronAPI.onNextSketch(handleNextClicked)
  window.electronAPI.onPrevSketch(handlePrevClicked)
  window.electronAPI.onSelect(handleSelectClicked)
  window.electronAPI.onBack(handleBackClicked)
  window.electronAPI.onImportSketch(handleImportSketch)

  window.electronAPI.setName({
    name: "creative-coding-showcase",
    displayName: "Creative Coding Showcase"
  })

  // Fetch any commandline options from the main process
  let newOpts = await window.electronAPI.getOpts()
  opts = { ...newOpts }

  // If options specify that the cursor should not be hidden
  if (opts.hideCursor) {
    console.log("we should hide the cursor")
    divMain.addClass("hideCursor")
    document.body.classList.add("hideCursor")
  } else {
    console.log("we should show the cursor")
    divMain.removeClass("hideCursor")
    document.body.classList.remove("hideCursor")
  }

  // If options specify that the select dropdown should be shown
  // (for debugging purposes)
  if (opts.showSketchDropdown) {
    selSketchCovers.show()
    selSketchCovers.position(10, 10)
  }

  // Set the debounceTime from the options.
  lastKp = -opts.debounceTime

  // Fetch the json for the sketches already included in the showcase
  console.log(
    `Fetching configuration json from: ${opts.sketchesPath}/_links.json`)
  const showcaseResponse = await fetch(`${opts.sketchesPath}/_links.json`)
  showcaseJson = await showcaseResponse.json()

  // Also fetch additional json for imported sketches if options indicate
  if (opts.allowP5jsImports) {
    try {
      console.log(
        `Fetching import json from: ${opts.sketchesPath}/_imports/_links.json`)
      const importResponse = await fetch(
        `${opts.sketchesPath}/_imports/_links.json`)
      importJson = await importResponse.json()
    } catch (e) {
      console.error("error fetching links json: ", e)
    }
  }

  // Create a 'bookend' cover for the start.
  createBookendCover()

  // If specified in options, create cover for import sketch functionality.
  if (opts.allowP5jsImports) {
    createImportCover()
  }

  // Add the additional imported sketches if options indicate
  if (opts.allowP5jsImports) {
    createCoversFromJson(importJson)
  }

  createCoversFromJson(showcaseJson)

  // numCovers = coverIdx

  // Create a 'bookend' cover for the end.
  createBookendCover()

  // Check if there is an index provided in the hash
  // This allows us to 'remember' which index is selected.
  let hash = window.location.hash.split("?")[0]
  let hashId = hash.match(/^#(?<id>cover-\d*)$/)
  hashId = hashId?.groups?.id
  if (hashId && document.querySelector(`#${hashId}`)) {
    setSelectedCoverId(hashId)
  } else {
    // Set the selected cover to be the first 
    let covers = select("#covers")
    selectedCoverId = covers.elt.children[1].id
    setSelectedCoverId(selectedCoverId)
  }

  updateUI()
}

function createCoversFromJson(json, position) {
  const names = Object.keys(json).sort()
  let newCoverId = ""

  for (const name of names) {
    // console.log("json[name].cabinet.split(','):", json[name].cabinet.split(","))

    if (json[name].is_buggy) {
      // console.log(`${name} is_buggy => not adding`);
    } else if (!json[name].has_confirmed) {
      // console.log(`${name} has not confirmed => not adding`);
    } else if (
      // Check if the name matches, or is 'test'
      opts.cabinetName == "test" ||
      json[name].cabinet.split(",").includes(opts.cabinetName)
    ) {
      newCoverId = createSketchCover(name, json, position)
      json[name].coverId = newCoverId
    }
  }

  return newCoverId
}

/////////////////////////////////////////////////
//
// Update the user interface based on whether the gallery or sketch should show.
//
function updateUI() {
  if (isShowingGallery) {
    unloadSketch()
    divMain.addClass("isShowingGallery")
    divGallery.removeClass("hidden")
    window.focus()
  } else {
    divMain.removeClass("isShowingGallery")
    divGallery.addClass("hidden")
  }
}

/////////////////////////////////////////////////
//
// Set the currently selected sketch.
//
function setSelectedCoverId(newId) {
  let oldTarget = select(`#${selectedCoverId}`)
  if (oldTarget) {
    oldTarget.removeClass("current")
  }
  let newTarget = select(`#${newId}`)
  let behavior = "auto"
  let scrollOpts = { behavior, block: "center", inline: "center" }
  newTarget.elt.scrollIntoView(scrollOpts)
  newTarget.addClass("current")

  // TODO: Fix up which one is selected in the dropdown.
  let newIdx = Array.from(selSketchCovers.elt.options).findIndex(
    o => o.dataset.coverId === newId)
  selSketchCovers.elt.selectedIndex = newIdx

  updateLinks()
  selectedCoverId = newId
}

/////////////////////////////////////////////////
//
// Update the location hash to include the currently selected index.
//
function updateLinks() {
  let id = selSketchCovers.elt.selectedOptions[0].dataset.coverId
  window.location.hash = id
}

/////////////////////////////////////////////////
//
// Check if the currently loaded sketch is running.
//
function checkRunning(ifm) {
  if (ifm.elt.contentWindow.frameCount > 0) {
    ifm.elt.contentDocument.body.classList.add("loaded")
  } else {
    setTimeout(() => checkRunning(ifm), 10)
  }
}

/////////////////////////////////////////////////
//
// Unload the currently loaded sketch.
//
function unloadSketch() {
  if (ifm) {
    ifm.remove()
    ifm = null
    // ifm.removeAttribute('src');  
  }
}

/////////////////////////////////////////////////
//
// Perform some crude 'debouncing' for arcade bonnet.
// This is adjustable in the debounceTime config option.
// 
function isDebouncing() {
  let thisKp = millis()
  let timePassed = thisKp - lastKp
  lastKp = thisKp

  return timePassed < opts.debounceTime
}

/////////////////////////////////////////////////
//
// Get the different parts of the name (first, second).
//
// function getNameParts(name){
//   return {
//     firstName: showcaseJson[name].first_name,
//     lastName: showcaseJson[name].last_name
//   }
// }

/////////////////////////////////////////////////
//
// Create a cover for the sketch based on the json info for the given name.
//
function createSketchCover(name, json, position) {
  // let {firstName, lastName} = getNameParts(name)
  // let title = `${firstName} ${lastName}`
  let title = name

  // Set a default thumb
  let thumb = "./assets/default_thumb.png"

  // Get the thumb. if it exists.
  if (!json[name].missing_files.includes("thumb")) {
    thumb = `${opts.sketchesPath}/${json[name].thumb}`
  }

  let newCoverId = createCover(name, title, thumb, position)

  return newCoverId
}

/////////////////////////////////////////////////
//
// Create a cover to import a sketch from the p5js library
// This should only be shown if the option 'allowP5jsImports' has been set
//
function createImportCover() {
  let thumb = "./import/thumb.png"
  let name = "Import Sketch"
  let title = name

  let newCoverId = createCover(name, title, thumb)

  return newCoverId
}

/////////////////////////////////////////////////
//
// Create a 'bookend' cover at the start/end of the gallery.
// This is just for layout purposes.
// TODO: There is undoubtedly a better way to do this using just css!
//
function createBookendCover() {
  let div = createDiv("end")
  div.addClass("cover")
  div.addClass("end")
  let covers = select("#covers")
  div.parent(covers)
}

/////////////////////////////////////////////////
//
// Helper function to create a cover given the provided info.
// If path to thumb is not included, then it is not added.
// 
function createCover(name, title, thumb, position) {
  let coverId = getNextCoverId()

  let opt = document.createElement("option")
  opt.value = name
  opt.text = name
  opt.dataset.coverId = coverId

  selSketchCovers.elt.add(opt, position)

  let html = `<div class="name">${title}</div>`
  let div = createDiv(html)
  div.addClass("fade-in")
  let thumbBg = colourFromString(name)
  if (thumb) {
    div.attribute("style",
      `background-image: url("${thumb}?d=${Date.now()}");
      background-color: ${thumbBg}`)
  }
  div.addClass("cover")

  div.id(coverId)
  let covers = select("#covers")

  //div.parent(covers)

  covers.elt.insertBefore(div.elt, covers.elt.children[position + 1])

  div.mouseClicked(() => {
    setSelectedCoverId(coverId)
  })

  return coverId
}

// Given an arbitrary string, convert it into a colour.
function colourFromString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash += str.charCodeAt(i)
  }

  let h = floor((hash % 720) / 2)
  let s = 40
  let l = 100

  // let r = (hash & 0xFF0000) >> 16
  // let g = (hash & 0x00FF00) >> 8
  // let b = hash & 0x0000FF

  return `rgb(${h}, ${s}, ${l})`
}

// Remove a previously created cover from the UI. So that it can be updated.
function removeCover(coverId) {
  let opt = Array.from(selSketchCovers.elt.options).find(
    o => o.dataset.coverId === coverId)

  opt.parentNode.removeChild(opt)

  let div = document.querySelector(`#${coverId}`)
  let covers = select("#covers")
  covers.elt.removeChild(div)

  // TODO: Figure out what should happen to the selection, if the removed 
  // cover was the currently selected one.
}

// Return the currently selected cover id
function getSelectedCover() {
  return document.querySelector(`#${selectedCoverId}`)
}

// Return the number of covers currently loaded
function getNumCovers() {
  let covers = document.querySelector("#covers")
  return covers.children.length - 2
}

function getNextCoverId() {
  let coverId = `cover-${nextCoverIdNum}`
  nextCoverIdNum += 1
  return coverId
}

//////////////////////////////////////////////////////////////////////////
//
// Event handlers
//

/////////////////////////////////////////////////
//
// Handle when the 'next' menu item is clicked.
//
function handleNextClicked(numToMove) {
  // let nextIdx = min(currIdx + numToMove, selectCover.elt.options.length -
  // 1)

  let currDiv = getSelectedCover()
  let nextIdx = Array.from(
    currDiv.parentNode.children).indexOf(currDiv) + numToMove

  nextIdx = min(nextIdx, currDiv.parentNode.children.length - 2)
  let nextDiv = currDiv.parentNode.children[nextIdx]

  setSelectedCoverId(nextDiv.id)
}

/////////////////////////////////////////////////
//
// Handle when the prev menu item is clicked.
//
function handlePrevClicked(numToMove) {
  // let prevIdx = max(0, currIdx - numToMove)

  let currDiv = getSelectedCover()
  let prevIdx = Array.from(
    currDiv.parentNode.children).indexOf(currDiv) - numToMove

  prevIdx = max(prevIdx, 1)
  let prevDiv = currDiv.parentNode.children[prevIdx]

  setSelectedCoverId(prevDiv.id)
}

/////////////////////////////////////////////////
//
// Handle when the 'back' menu item is clicked.
//
function handleBackClicked() {
  if (isDebouncing()) {
    return
  }

  if (isShowingGallery) {
    handleSelectClicked(true)
  } else {
    // console.clear()
    isShowingGallery = true
    updateUI()
    window.electronAPI.setName({
      name: "creative-coding-showcase",
      displayName: "Creative Coding Showcase"
    })
  }
}

/////////////////////////////////////////////////
//
// Handle when there is a new sketch to import
//
function handleImportSketch(json) {
  console.log("handleImportSketch():", json)

  let names = Object.keys(json)

  // Handle the case where a version of the sketch is already in the
  // importJson
  for (let n of names) {
    let wasSelected = false

    if (Object.hasOwn(importJson, n)) {
      console.log("Remove old cover and create a new one.")
      let oldCoverId = importJson[n].coverId

      // First check whether the old cover was selected
      let oldCoverDiv = document.querySelector(`#${oldCoverId}`)
      if (oldCoverDiv.classList.contains("current")) {
        console.log("The old cover was selected!")
        wasSelected = true
      }

      removeCover(oldCoverId)
    }
    // Add the new json into the json list and create a new cover for it
    importJson[n] = json[n]
    let jsonFragment = {}
    jsonFragment[n] = json[n]
    // Add the new cover at the start, after the importJSON sketch.
    let newCoverId = createCoversFromJson(jsonFragment, 1)
    importJson[n].coverId = newCoverId

    if (wasSelected) {
      setSelectedCoverId(newCoverId)
    }
  }
}

/////////////////////////////////////////////////
//
// Handle when the select menu item is clicked.
//
function handleSelectClicked(skipDebounce) {
  if (!skipDebounce && isDebouncing()) {
    return
  }

  let name = selSketchCovers.value()

  // TODO: This is a hack to quickly get it working, but it will do for now.
  if (Object.hasOwn(showcaseJson, name)) {
    showSketch(name, showcaseJson)
  } else if (Object.hasOwn(importJson, name)) {
    showSketch(name, importJson)
  } else if (name === "Import Sketch") {
    showImportSketch(name)
  } else {
    console.log("Don't know sketch: ", name)
  }
}

// Load the 'Import Sketch' sketch into the frame.
function showImportSketch(name) {
  console.log("showImportSketch()")

  let displayName = name
  let sketchPath = "import/index.html"

  loadSketch(name, displayName, sketchPath, true)
}

// Show the specified sketch (from the showcase) in the frame. 
function showSketch(name, json) {

  // let {firstName, lastName} = getNameParts(name)
  // let displayName = `${firstName} ${lastName}`

  let displayName = name
  let sketchUrl = json[name].sketch
  let sketchPath = `${opts.sketchesPath}/${sketchUrl}`
  //let shouldShowCursor = json[name].show_cursor === true
  let shouldShowCursor = opts.hideCursor ? false : true
    || json[name].show_cursor === true

  console.log("sketchPath", sketchPath)

  loadSketch(name, displayName, sketchPath, shouldShowCursor)
}

// Helper to load a sketch into the frame (import, or showcase)
function loadSketch(name, displayName, sketchPath, shouldShowCursor) {
  window.electronAPI.setName({
    name,
    displayName
  })

  ifm = createElement("iframe")
  // ifm.attribute('scrolling', 'no');
  ifm.addClass("ifm")
  ifm.addClass("full")
  ifm.elt.onload = () => {
    ifm.elt.contentWindow.focus()

    if (shouldShowCursor) {
      console.log("should show cursor in sketch")
      ifm.elt.contentDocument.body.classList.remove("hideCursor")
    }
    else {
      console.log("should not show cursor in sketch")
      ifm.elt.contentDocument.body.classList.add("hideCursor")
    }

    // If we are going to fix the layout on this sketch, then once the iframe
    // has loaded, we need to add a css link to the header.
    // Also, for my fixes, I show a glowing border once the sketch has
    // actually started running, so there is a timeout to check for that.
    if (opts.fixCss) {
      ifm.removeClass("full")

      let fixCssLink = location.pathname.replace(
        /showcase.html$/, "showcase.css")

      let cssLink = createElement("link")
      cssLink.attribute("href", fixCssLink)
      cssLink.attribute("type", "text/css")
      cssLink.attribute("rel", "stylesheet")
      ifm.elt.contentDocument.head.append(cssLink.elt)
      checkRunning(ifm)
    }
  }
  ifm.attribute("src", `${sketchPath}?d=${Date.now()}`)
  ifm.parent("#main")

  isShowingGallery = false
  updateUI()
}

/////////////////////////////////////////////////
//
// Handle when the selection changes.
//
function handleCoverSelectionChanged() {
  let id = selSketchCovers.elt.selectedOptions[0].dataset.coverId
  setSelectedCoverId(id)
}

/////////////////////////////////////////////////
//
// Handle key presses from the user.
//
function keyPressed() {
  if (isDebouncing()) {
    return false
  }

  if (isShowingGallery) {

    let choice = ""

    if (
      [17, LEFT_ARROW].includes(keyCode) ||
      ["1"].includes(key)) {
      choice = "prev"
    } else if (
      [18, RIGHT_ARROW].includes(keyCode) ||
      ["3"].includes(key)) {
      choice = "next"
    } else if (
      [DOWN_ARROW, UP_ARROW, ENTER].includes(keyCode) ||
      ["2", " "].includes(key)) {
      choice = "select"
    }

    if (choice === "prev") {
      handlePrevClicked(1)
    } else if (choice == "next") {
      handleNextClicked(1)
    } else if (choice == "select") {
      console.log("select clicked")
      handleSelectClicked(true)
    }
  }
  return false
}
