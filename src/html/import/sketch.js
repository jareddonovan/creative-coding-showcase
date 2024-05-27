
let cabinetName
let importsUrl
let newImportLink
let cnv
let qrCode
let importCode
let hasGeneratedCode = false

let imgStep1
let imgStep1Button
let imgStep1Space
let imgStep2
let imgStep3

let instructions = {
  step1: {
    huey: "Press the LEFT button to get started. You'll need your sketch URL and student number.",
    dewey: "Press the SPACE BAR to get started. You'll need your sketch URL and student number.",
    louie: "Press the LEFT button to get started. You'll need your sketch URL and student number.",
    test: "Press the SPACE BAR to get started. You'll need your sketch URL and student number."
  },
  step2a: {
    huey: "Next press the MIDDLE button for a QR code. The code will take you to a website.",
    dewey: "Next press the ENTER key for a QR code. The code will take you to a website.",
    louie: "Next press the MIDDLE button for a QR code. The code will take you to a website.",
    test: "Next press the ENTER key for a QR code. The code will take you to a website.",
  },
  step2b: {
    huey: "The site asks for your student number and sketch URL. Fill that in now. Press RIGHT button when done",
    dewey: "The site asks for your student number and sketch URL. Fill that in now. Press SPACE when done",
    louie: "The site asks for your student number and sketch URL. Fill that in now. Press RIGHT button when done",
    test: "The site asks for your student number and sketch URL. Fill that in now. Press SPACE when done"
  },
  step3: "You can now exit this page. Your sketch will show in the gallery in a few minutes. YELLOW button to exit.",
}

let keys = {
  next: {
    huey: "1",
    dewey: " ",
    louie: "1",
    test: " "
  },
  generateCode: {
    huey: "2".charCodeAt(0),
    dewey: 13,
    louie: "2".charCodeAt(0),
    test: 13
  },
  lastStep: {
    huey: "3",
    dewey: " ",
    louie: "3",
    test: " "
  }
}

let currentStep = 1

let m = 20

let fntArtyImg
let fntVT

function preload(){
  fntArtyImg = loadFont("fonts/BungeeShade-Regular.ttf")
  fntVT = loadFont("fonts/VT323-Regular.ttf")

  imgStep1Button = loadImage("images/step-1-button.png")
  imgStep1Space = loadImage("images/step-1-space.png")
  imgStep2 = loadImage("images/step-2.png")
  imgStep3 = loadImage("images/step-3.png")
}

function setup(){
  cnv = createCanvas(1280, 720)
  colorMode(HSB)
  textAlign(CENTER, CENTER)

  cabinetName = window?.parent?.opts?.cabinetName || "test"
  importsUrl = window?.parent?.opts?.importsUrl || "http://0.0.0.0/imports"

  if (cabinetName == "test" || cabinetName == "dewey"){
    imgStep1 = imgStep1Space
  } else {
    imgStep1 = imgStep1Button
  }

  qrCode = createDiv()
  qrCode.style("width", `${0.5 * height}px`)
  qrCode.id("qrCode")
  qrCode.parent(select("main"))
  qrCode.style("position", "absolute")
  qrCode.style("left", "-10000px")
  qrCode.style("top", "-10000px") 
  
  // qrCode.hide()

  // newImportLink = createA("#", "")
  // newImportLink.style("width", `${width}px`)
  // newImportLink.id("newImportLink")
  // newImportLink.parent(select("main"))
  // newImportLink.hide()
}

function draw(){
  background(169, 245, 255)
  
  // if (currentStep == 1){
  //   qrCode.removeClass("fade-in")
  //   qrCode.hide()
  // }
  // newImportLink.hide()

  background(187, 34, 100)

  push()
  translate(width / 2, 50)

  push()
  noStroke()
  fill(50, 20, 100)
  quad(-500, -30, 450, -40, 500, 50, -480, 40)
  pop()

  rotate(radians(-1))
  textFont(fntArtyImg)
  textSize(64)
  textAlign(CENTER, CENTER)
  text("IMPORT YOUR SKETCH", 0, 0)
  pop()

  push()
  textFont(fntVT)
  textSize(48)
  textAlign(CENTER, TOP)
  text("Follow these steps to add your sketch to the cabinet", 
    0, 110, width, 100)
  pop()

  push()
  noStroke()
  let rectHu = (frameCount / 5) % 360
  let rectX = m
  let rectY = 155 + m
  let rectW = (width - m * 4) / 3
  let rectH = height - (180 + 3 * m)

  // STEP 1 rect
  fill(rectHu, 30, 90)
  rect(rectX, rectY, rectW, rectH)
  image(imgStep1, rectX, rectY)

  if (currentStep == 1){
    drawCurrentBorder(rectX, rectY, rectW, rectH)
  }

  // STEP 1 title
  push()
  fill((rectHu + 180) % 360, 40, 40)
  textFont(fntArtyImg)
  textSize(48)
  textAlign(CENTER, CENTER)
  text("STEP 1.", rectX, rectY, rectW, 60)

  // STEP 1 instructions
  if (currentStep == 1){
    textFont(fntVT)
    textAlign(LEFT, TOP)
    fill((rectHu + 180) % 360, 20, 20)
    textSize(24)
    text(instructions.step1[cabinetName], 
      rectX + m, rectY + 380, rectW - m, 0.3 * rectH
    )
  }    
    
  pop()

  // STEP 2 rect
  rectX += rectW + m
  rectHu = (rectHu + 120) % 360
  fill(rectHu, 30, 90)
  rect(rectX, rectY, rectW, rectH)
  
  if (currentStep == 2){
    drawCurrentBorder(rectX, rectY, rectW, rectH)
  }

  if (currentStep == 2 && hasGeneratedCode){
    drawCode(rectX, rectY, rectW, rectH)
  } else {
    image(imgStep2, rectX, rectY)
  }

  // STEP 2 title
  push()
  fill((rectHu + 180) % 360, 40, 40)
  textFont(fntArtyImg)
  textSize(48)
  textAlign(CENTER, CENTER)
  text("STEP 2.", rectX, rectY, rectW, 60)

  // STEP 2 instructions
  if (currentStep == 2){
    textFont(fntVT)
    textAlign(LEFT, TOP)
    fill((rectHu + 180) % 360, 20, 20)
    textSize(24)
    let step2Instructions = !hasGeneratedCode 
      ? instructions.step2a[cabinetName]
      : instructions.step2b[cabinetName]

    text(step2Instructions, 
      rectX + m, rectY + 380, rectW - m, 0.3 * rectH
    )
  }
  pop()

  // STEP 3 rect
  rectX += rectW + m
  rectHu = (rectHu + 120) % 360
  fill(rectHu, 30, 90)
  rect(rectX, rectY, rectW, rectH)
  image(imgStep3, rectX, rectY)


  if (currentStep == 3){
    drawCurrentBorder(rectX, rectY, rectW, rectH)
  }

  // STEP 3 title
  push()
  fill((rectHu + 180) % 360, 40, 40)
  textFont(fntArtyImg)
  textSize(48)
  textAlign(CENTER, CENTER)
  text("STEP 3.", rectX, rectY, rectW, 60)
  
  // STEP 3 instructions
  if (currentStep == 3){
    textFont(fntVT)
    textAlign(LEFT, TOP)
    fill((rectHu + 180) % 360, 20, 20)
    textSize(24)
    text(instructions.step3, 
      rectX + m, rectY + 380, rectW - m, 0.3 * rectH
    )
  }
  pop()
  pop() // Finished 3 rectangles

  push()

  let bottomTxtY = rectY + rectH + m

  textFont(fntVT)
  textSize(36)
  textAlign(CENTER, TOP)
  text("Only post nice stuff. Contact j.donovan@qut.edu.au if you have problems", 
    0, bottomTxtY, width, height - bottomTxtY)
  pop()
}

function drawCode(x, y, w, h){
  // qrCode.show()
  // newImportLink.show()
  
  positionOnCanvas(qrCode, x + 20, y + 15, 360, 360)
  // positionOnCanvas(newImportLink, x, y)

  // text(`Import: ${importCode}`,
  //   0, 0, width, height)

  // noLoop()  

}

function drawCurrentBorder(x, y, w, h){
  // console.log("x", x, "y", y, "w", w, "h", h)

  push()
  noFill()
  let borderH = 40 // + 5 * sin(frameCount / 20)
  let borderA = 0.9 //  + 0.1 * sin(frameCount / 20)
  stroke(borderH, 30, 100, borderA)
  strokeWeight(5)
  drawingContext.shadowBlur = 32
  drawingContext.shadowColor = color(borderH, 60, 100, borderA)
  rect(x - m / 3, y - m / 3, w + 2 * m / 3, h + 2 * m / 3, 
    m/6, m/6, m/6, m/6)
  pop()  
}

// function mousePressed(){
// }

// Update the URL and QRCode for requesting a new import of a p5js sketch.
async function updateUrl(){
  console.log("updateUrl()")
  importCode = await parent?.window?.electronAPI?.generateImportCode() || "xxx"

  let params = `?i=${importCode}&c=${cabinetName}`
  let newImportUrl = `${importsUrl}/new.php${params}`  
  // let linkText = newImportUrl
  // linkText = linkText.split("//")[1]

  // newImportLink.html( 
  //   `<a href="${newImportUrl}" target="_blank">${linkText}</a>`
  // )

  console.log("newImportUrl:", newImportUrl)

  // Clear and regenerate the QR code
  qrCode.html("")
  new QRCode(qrCode.elt, {
    text: newImportUrl,
    width: 360,
    height: 360,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.L
  })

  qrCode.show()
  qrCode.addClass("fade-in")

  hasGeneratedCode = true
}

async function keyPressed(){
  console.log("key", key, "keyCode", keyCode)

  // updateUrl()
  let nextStep = currentStep

  if (currentStep == 1){
    if (key == keys.next[cabinetName]){
      nextStep = 2
    }
  } else if (currentStep == 2){
    if (hasGeneratedCode && key == keys.lastStep[cabinetName]){
      nextStep = 3
      qrCode.removeClass("fade-in")
      qrCode.addClass("fade-out")
    } else if (!hasGeneratedCode && keyCode == keys.generateCode[cabinetName]){
      await updateUrl()
    }
  } else if (currentStep == 3){
    if (key == keys.next[cabinetName]){
      window?.parent?.handleBackClicked()
    }
  }

  currentStep = nextStep
}

// Function to position an html element relative to the canvas.
function positionOnCanvas(elem, x, y, w, h){
  console.log("px", x, "py", y, "pw", w, "ph", h)

  // Get left and top position of canvas
  let cX = cnv.elt.offsetLeft
  let cY = cnv.elt.offsetTop

  elem.style("position", "absolute")
  elem.style("left", `${x + cX}px`)
  elem.style("top", `${y + cY}px`) 
  if (w){
    elem.style("width", `${w}px`)
  }
  if (h){
    elem.style("height", `${h}px`)
  }
}