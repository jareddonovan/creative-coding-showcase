
let cabinetName
let importsUrl
let newImportLink
let cnv
let qrCode
let importCode
let hasGeneratedCode = false

function setup(){
  cnv = createCanvas(800, 800)
  background(220)
  textAlign(CENTER, CENTER)

  cabinetName = window.parent.opts.cabinetName
  importsUrl = window.parent.opts.importsUrl

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

  text(`Import: ${importCode}`,
    0, 0, width, height)

  // noLoop()  
}

// function mousePressed(){
// }

// Update the URL and QRCode for requesting a new import of a p5js sketch.
async function updateUrl(){
  importCode = await parent.window.electronAPI.generateImportCode()

  let params = `?i=${importCode}&c=${cabinetName}`
  let newImportUrl = `${importsUrl}/new.php${params}`  
  let linkText = newImportUrl
  linkText = linkText.split("//")[1]

  newImportLink.html( 
    `<a href="${newImportUrl}" target="_blank">${linkText}</a>`
  )
  // Clear and regenerate the QR code
  qrCode.html("")
  new QRCode(qrCode.elt, {
    text: newImportUrl,
    width: width * 0.75,
    height: width * 0.75,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.L
  })

  hasGeneratedCode = true
}

async function keyPressed(){
  updateUrl()
}

// Function to position an html element relative to the canvas.
function positionOnCanvas(elem, x, y){
  // Get left and top position of canvas
  let cX = cnv.elt.offsetLeft
  let cY = cnv.elt.offsetTop

  elem.style("position", "absolute")
  elem.style("left", `${cX + x}px`)
  elem.style("top", `${cY + y}px`) 
}