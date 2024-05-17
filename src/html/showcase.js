/*
 * JavaScript file for the 'gallery' part of the showcase app. This is written
 * as a p5js sketch, although it doesn't use a canvas. 
 * 
 * Jared Donovan 2024.
 */

let opts = {
  debounceTime: 100
}
let json
let selectCover
let ifm
let divGallery
let divMain
let isShowingGallery = true
let currIdx = 0
// let numCovers = 0
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
  selectCover = createSelect()
  selectCover.changed(handleCoverSelectionChanged)
  selectCover.parent(select("main"))
  selectCover.position(10, 10)
  // sel.hide()

  divGallery = select("#gallery")
  divMain = select("main")

  window.electronAPI.onNextSketch(handleNextClicked)
  window.electronAPI.onPrevSketch(handlePrevClicked)
  window.electronAPI.onSelect(handleSelectClicked)
  window.electronAPI.onBack(handleBackClicked)

  window.electronAPI.setName({
    name: "creative-coding-showcase", 
    displayName: "Creative Coding Showcase"})

  // Fetch any commandline options from the main process
  let newOpts = await window.electronAPI.getOpts()
  opts = {...newOpts}

  // Set the debounceTime from the options.
  lastKp = -opts.debounceTime
  
  // Fetch the json for the sketches
  console.log(
    `Fetching configuration json from: ${opts.sketchesPath}/_links.json`)
  const response = await fetch(`${opts.sketchesPath}/_links.json`)
  json = await response.json()

  // Create an 'end' cover
  createEndCover()

  const names = Object.keys(json).sort()

  let coverIdx = 0
  for (const name of names){
    if (json[name]._is_buggy){
      // console.log(`${name} _is_buggy => not adding`);
    } else if (!json[name]._has_confirmed) {
      // console.log(`${name} has not confirmed => not adding`);
    } else if (opts.cabinetName == "test" || 
      json[name]._cabinet == opts.cabinetName){
      selectCover.option(name)
      createCover(name, coverIdx)
      coverIdx += 1
    }
  }
  // numCovers = coverIdx
  
  createEndCover()

  // Check if there is an index provided in the hash
  // This allows us to 'remember' which index is selected.
  let hash = window.location.hash.split("?")[0]
  let hashIdx = hash.match(/#(\d*)$/)
  if (hashIdx){
    hashIdx = parseInt(hashIdx[1])
    if (!isNaN(hashIdx)){
      currIdx = hashIdx
    }
  } 
  setCurrIndex(currIdx)
  
  updateUI()
}

/////////////////////////////////////////////////
//
// Update the user interface based on whether the gallery or sketch should show.
//
function updateUI(){
  if (isShowingGallery){
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
function setCurrIndex(newIdx){
  if (newIdx >= 0 && newIdx < selectCover.elt.options.length){
    let oldTarget = select(`#cover-${currIdx}`)
    oldTarget.removeClass("current")
    let newTarget = select(`#cover-${newIdx}`)
    let behavior = "auto"
    let scrollOpts = {behavior, block: "center", inline: "center"}
    newTarget.elt.scrollIntoView(scrollOpts)
    newTarget.addClass("current")
    
    selectCover.elt.selectedIndex = newIdx
    updateLinks()
    currIdx = newIdx
  }
}

/////////////////////////////////////////////////
//
// Update the location hash to include the currently selected index.
//
function updateLinks() {
  let idx = selectCover.elt.selectedIndex
  window.location.hash = idx
}

/////////////////////////////////////////////////
//
// Check if the currently loaded sketch is running.
//
function checkRunning(ifm){
  if (ifm.elt.contentWindow.frameCount > 0){
    ifm.elt.contentDocument.body.classList.add("loaded")
  } else {
    setTimeout(() => checkRunning(ifm), 10)
  }
}

/////////////////////////////////////////////////
//
// Unload the currently loaded sketch.
//
function unloadSketch(){
  if (ifm){
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
function isDebouncing(){
  let thisKp = millis() 
  let timePassed = thisKp - lastKp
  lastKp = thisKp

  return timePassed < opts.debounceTime
}

/////////////////////////////////////////////////
//
// Get the different parts of the name (first, second).
//
function getNameParts(name){
  return {
    firstName: json[name].first_name,
    lastName: json[name].last_name
  }
}

/////////////////////////////////////////////////
//
// Create a cover for the sketch based on the json info for the given name.
//
function createCover(name, idx){
  let {firstName, lastName} = getNameParts(name)
  let thumb = json[name].thumb
  let html = `<div class="name">${firstName} ${lastName}</div>`

  let div = createDiv(html)
  div.attribute("style", 
    `background-image: url("${opts.sketchesPath}/${thumb}");`)
  div.addClass("cover")
  div.id(`cover-${idx}`)
  let covers = select("#covers")
  div.parent(covers)
  div.mouseClicked(() => {
    setCurrIndex(idx)
  })
}

/////////////////////////////////////////////////
//
// Create a cover at the end of the gallery.
// This is just for layout purposes.
// TODO: There is undoubtedly a better way to do this using just css!
//
function createEndCover(){
  let div = createDiv("end")
  div.addClass("cover")
  div.addClass("end")
  let covers = select("#covers")
  div.parent(covers)
}

//////////////////////////////////////////////////////////////////////////
//
// Event handlers
//

/////////////////////////////////////////////////
//
// Handle when the 'next' menu item is clicked.
//
function handleNextClicked(numToMove){
  let nextIdx = min(currIdx + numToMove, selectCover.elt.options.length - 1)
  setCurrIndex(nextIdx)
}

/////////////////////////////////////////////////
//
// Handle when the prev menu item is clicked.
//
function handlePrevClicked(numToMove){
  let prevIdx = max(0, currIdx - numToMove)
  setCurrIndex(prevIdx)
}

/////////////////////////////////////////////////
//
// Handle when the 'back' menu item is clicked.
//
function handleBackClicked(){
  if (isDebouncing()){
    return
  }

  if (isShowingGallery){
    handleSelectClicked(true)
  } else {
    // console.clear()
    isShowingGallery = true
    updateUI()  
    window.electronAPI.setName({
      name: "creative-coding-showcase", 
      displayName: "Creative Coding Showcase"})
  }
}

/////////////////////////////////////////////////
//
// Handle when the select menu item is clicked.
//
function handleSelectClicked(skipDebounce){
  if (!skipDebounce && isDebouncing()){
    return
  }

  let name = selectCover.value()
  let {firstName, lastName} = getNameParts(name)

  window.electronAPI.setName({
    name, 
    displayName: `${firstName} ${lastName}`})
  let sketchUrl = json[name].sketch
  let d = new Date().toISOString()

  let shouldShowCursor = json[name]._show_cursor === true

  ifm = createElement("iframe")
  // ifm.attribute('scrolling', 'no');
  ifm.addClass("ifm")
  ifm.addClass("full")
  ifm.elt.onload = () => {
    ifm.elt.contentWindow.focus()

    if (!shouldShowCursor){
      console.log("should not show cursor")
      ifm.elt.contentDocument.body.classList.add("hideCursor")
    }

    // If we are going to fix the layout on this sketch, then once the iframe
    // has loaded, we need to add a css link to the header.
    // Also, for my fixes, I show a glowing border once the sketch has
    // actually started running, so there is a timeout to check for that.
    if (opts.fixCss){
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
  ifm.attribute("src", `${opts.sketchesPath}/${sketchUrl}?d=${d}`)
  ifm.parent("#main")

  isShowingGallery = false
  updateUI()
}

/////////////////////////////////////////////////
//
// Handle when the selection changes.
//
function handleCoverSelectionChanged(){
  // console.log(sel.value(), sel.elt.selectedIndex);
  let idx = selectCover.elt.selectedIndex
  setCurrIndex(idx)
}

/////////////////////////////////////////////////
//
// Handle key presses from the user.
//
function keyPressed(){
  if (isDebouncing()){
    return false
  }
  
  if (isShowingGallery){

    let choice = ""

    if (
      [17, LEFT_ARROW].includes(keyCode) || 
      ["1"].includes(key)){
      choice = "prev"
    } else if (
      [18, RIGHT_ARROW].includes(keyCode) ||
      ["3"].includes(key)){
      choice = "next"
    } else if (
      [DOWN_ARROW, UP_ARROW, ENTER].includes(keyCode) ||
      ["2", " "].includes(key)){
      choice = "select"
    }

    if (choice === "prev"){
      handlePrevClicked(1)
    } else if (choice == "next"){
      handleNextClicked(1)
    } else if (choice == "select"){
      console.log("select clicked")
      handleSelectClicked(true)
    }
  }
  return false
}
