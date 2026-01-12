var elements = {
    canvas: $('#milkCanvas'),
    imgUpload: $("#milkInputImg")
}

var ctx
var currentImage

function init() {
    ctx = elements.canvas[0].getContext('2d')
    elements.imgUpload.on("change", importImage)
}

function importImage() {
    let fileUrl = URL.createObjectURL(this.files[0])
    let img = new Image()
    img.src = fileUrl
    currentImage = g.importImage(img)
    currentImage.draw(ctx)
}

addEventListener("DOMContentLoaded", init)