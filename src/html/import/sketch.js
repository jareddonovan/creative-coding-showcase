
let cabinetName
let newImportUrl
let newImportLink
let cnv
let qrCode
let currentId
let hasGeneratedCode = false;

function setup(){
  cnv = createCanvas(800, 800)
  background(220)
  textAlign(CENTER, CENTER)

  cabinetName = window.parent.opts.cabinetName
  newImportUrl = window.parent.importVars.newImportUrl

  qrCode = createDiv()
  qrCode.style("width", `${0.75 * width}px`)
  qrCode.id("qrCode")
  qrCode.parent(select("main"))
  qrCode.hide()

  newImportLink = createA()
  newImportLink.style("width", `${width}px`)
  newImportLink.id("newImportLink")
  newImportLink.parent(select("main"))
  newImportLink.hide()
}

function draw(){
  background(220)

  if (hasGeneratedCode){
    drawCode()
  } else {
    drawWelcome()
  }
}

function drawWelcome(){
  background(220)

  qrCode.hide()
  newImportLink.hide()

  text("Press any button to generate import code", 0, 0, width / 2, height)
}

function drawCode(){
  background(220)

  qrCode.show()
  newImportLink.show()
  
  positionOnCanvas(qrCode, 0.125 * width, 50)
  positionOnCanvas(newImportLink, 0, 0.75 * width + 50 + 20)

  text(`Import: ${currentId}`,
    0, 0, width, height)

  // noLoop()  
}

// function mousePressed(){
// }

function updateURL(){
  window.parent.generateNewId()

  currentId = window.parent.importVars.currentId
  let params = `?i=${currentId}&c=${cabinetName}`
  let newImportFullUrl = `${newImportUrl}${params}`  
  let linkText = newImportFullUrl
  linkText = linkText.split("//")[1]

  newImportLink.html( 
    `<a href="${newImportFullUrl}" target="_blank">${linkText}</a>`
  )

  // Clear and regenerate the QR code
  qrCode.html("")
  new QRCode(qrCode.elt, {
    text: newImportFullUrl,
    width: width * 0.75,
    height: width * 0.75,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.L
  })

  hasGeneratedCode = true
}

function keyPressed(){
  updateURL()
}

function positionOnCanvas(elem, x, y){
  // Get left and top position of canvas
  let cX = cnv.elt.offsetLeft
  let cY = cnv.elt.offsetTop

  elem.style("position", "absolute")
  elem.style("left", `${cX + x}px`)
  elem.style("top", `${cY + y}px`) 
}