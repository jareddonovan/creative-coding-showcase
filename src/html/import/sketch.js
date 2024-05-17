
let cabinetName
let newImportUrl
let newImportLink
let cnv
let qrCode
let currentId

function setup(){
  cnv = createCanvas(800, 800)
  background(220)
  textAlign(CENTER, CENTER)

  cabinetName = window.parent.opts.cabinetName
  newImportUrl = window.parent.importVars.newImportUrl

  newImportLink = createA()
  newImportLink.parent(select("main"))

  qrCode = createDiv()
  qrCode.style("width", "300px")
  qrCode.id("qrCode")
  qrCode.parent(select("main"))

  updateURL()
}

function draw(){
  background(220)

  positionOnCanvas(newImportLink, 20, 20)
  positionOnCanvas(qrCode, 20, 50)

  text(`Import: ${currentId}`,
    0, 0, width, height)

  // noLoop()
}

// function mousePressed(){
// }

function updateURL(){
  window.parent.generateNewID()

  currentId = window.parent.importVars.currentId
  let params = `?req=${currentId}&cabinet_name=${cabinetName}`
  let newImportFullUrl = `${newImportUrl}${params}`  
  newImportLink.html( 
    `<a href="${newImportFullUrl}" target="_blank">${newImportFullUrl}</a>`
  )

  // Clear and regenerate the QR code
  qrCode.html("")
  new QRCode(qrCode.elt, newImportFullUrl)
}

function keyPressed(){
  updateURL()
}

function positionOnCanvas(elem, x, y){
  // Get left and top position of canvas
  let cX = cnv.elt.offsetLeft
  let cY = cnv.elt.offsetTop

  // console.log("cX:", cX, "cY:", cY)

  elem.style("background", "red")
  elem.style("position", "absolute")
  elem.style("left", `${cX + x}px`)
  elem.style("top", `${cY + y}px`) 
}