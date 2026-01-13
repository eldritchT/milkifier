var c = new OffscreenCanvas(300, 300)
var imgUpload = $('#milkInputImg')

var ctx
var currentImage
var currentImageCtx

const ramps = {
    MilkInside: [
        { position: 0.0, color: [0, 0, 0] },
        { position: 0.5, color: [92, 1, 32] },
        { position: 1.0, color: [124, 18, 140] }
    ],
    MilkOutside: [
        { position: 0.0, color: [13, 13, 20] },
        { position: 0.5, color: [82, 38, 62] },
        { position: 1.0, color: [172, 50, 50] }
    ],
    MOGreen: [
        { position: 0.0, color: [13, 18, 20] },
        { position: 0.5, color: [38, 82, 72] },
        { position: 1.0, color: [50, 172, 139] }
    ]
}

var fx = {
    posterize: false,
    milkify: false,
    milkifyRamp: ramps.MilkInside,
    contrast: 0,
    brightness: 0,
    autoApply: false
}

function addOptions() {
    let cs = $("#milkColorSelect")
    for (r of Object.keys(ramps)) {
        let opt = $("<option></option>")
        opt.attr("value", r)
        opt.text(r)
        cs.append(opt)
    }
}

function init() {
    ctx = c.getContext('2d')
    imgUpload.on("change", importImage)
    addOptions()
    $("#milkParamContrast").on("change", function () { fx.contrast = parseInt(this.value) })
    $("#milkParamBrightness").on("change", function () { fx.brightness = parseInt(this.value) })
    $("#milkPosterize").on("click", function () { fx.posterize = $(this)[0].checked })
    $("#milkColorSelect").on("change", function () { fx.milkifyRamp = ramps[this.value] })
    $("#milkify").on("click", function () { fx.milkify = $(this)[0].checked })
    $("#milkAuto").on("click", function () { fx.autoApply = $(this)[0].checked })
    $("input,select").on("change", function () { if (fx.autoApply) { applyEffects() } })
}

function fileToImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Image loading error"));
        };

        reader.onerror = () => reject(new Error("File reading error"));
        reader.readAsDataURL(file);
    });
}

function importImage() {
    let file = this.files[0]
    console.log(this.files)
    let img = fileToImage(file)
        .then((img) => {
            currentImage = g.importImage(img)
            c = new OffscreenCanvas(img.width, img.height)
            ctx = c.getContext('2d')
            ctx.translate(c.width / 2, c.height / 2)
            currentImage.draw(ctx)
            currentImageCtx = currentImage.canvas.getContext('2d')
            updateImg()
        })

}

function posterize() {
    let posterizedImg = g.posterize(currentImage)
    posterizedImg.draw(ctx, 3)
    updateImg()
}

function colorize(r, g, b) {
    const imageData = ctx.getImageData(0, 0, c.width, c.height)

    for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i + 0] += r
        imageData.data[i + 1] += g
        imageData.data[i + 2] += b
    }

    ctx.putImageData(imageData, 0, 0)
    updateImg()
}

function colorRamp(inputImageData, colorStops, disableInter = false) {
    const imageData = ctx.getImageData(0, 0, inputImageData.width, inputImageData.height);

    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; // Calculate luminance
        const color = disableInter ? getNearestColor(luminance, colorStops) : getColorFromRamp(luminance, colorStops)

        data[i] = color[0]      // r
        data[i + 1] = color[1]  // g
        data[i + 2] = color[2]  // b
    }

    ctx.putImageData(imageData, 0, 0);
}

function getColorFromRamp(value, colorStops) {
    const numStops = colorStops.length

    const normalizedValue = Math.max(0, Math.min(1, value / 255))

    for (let i = 0; i < numStops - 1; i++) {
        if (normalizedValue >= colorStops[i].position && normalizedValue <= colorStops[i + 1].position) {
            const color1 = colorStops[i].color
            const color2 = colorStops[i + 1].color
            const t = (normalizedValue - colorStops[i].position) / (colorStops[i + 1].position - colorStops[i].position)

            return [
                Math.round((1 - t) * color1[0] + t * color2[0]),
                Math.round((1 - t) * color1[1] + t * color2[1]),
                Math.round((1 - t) * color1[2] + t * color2[2]),
            ];
        }
    }

    return colorStops[0].color
}

function getNearestColor(value, colorStops) {
    const numStops = colorStops.length

    const normalizedValue = Math.max(0, Math.min(1, value / 255))

    let nearestColor = colorStops[0].color
    let minDiff = Math.abs(normalizedValue - colorStops[0].position)

    for (let i = 1; i < numStops; i++) {
        const diff = Math.abs(normalizedValue - colorStops[i].position)
        if (diff < minDiff) {
            minDiff = diff
            nearestColor = colorStops[i].color
        }
    }

    return nearestColor
}

function _brightnessImage(imgData, brightness) {
    var d = imgData.data;
    brightness = (brightness / 100) + 1
    var intercept = 128 * (1 - brightness)
    for (var i = 0; i < d.length; i += 4) {
        d[i] = d[i] - brightness + intercept
        d[i + 1] = d[i + 1] - brightness + intercept
        d[i + 2] = d[i + 2] - brightness + intercept
    }
    return imgData
}

function _contrastImage(imgData, contrast) {
    var d = imgData.data;
    contrast = (contrast / 100) + 1
    var intercept = 128 * (1 - contrast)
    for (var i = 0; i < d.length; i += 4) {
        d[i] = d[i] * contrast + intercept
        d[i + 1] = d[i + 1] * contrast + intercept
        d[i + 2] = d[i + 2] * contrast + intercept
    }
    return imgData
}

function setContrast(val) {
    fx.contrast = val
    var imageData = _contrastImage(ctx.getImageData(0, 0, c.width, c.height), val)
    ctx.putImageData(imageData, 0, 0);
}

function setBrightness(val) {
    fx.brightness = val
    var imageData = _brightnessImage(ctx.getImageData(0, 0, c.width, c.height), val)
    ctx.putImageData(imageData, 0, 0);
}

function milkify() {
    colorRamp(ctx.getImageData(0, 0, c.width, c.height), fx.milkifyRamp, true)
}

function applyEffects() {
    currentImage.draw(ctx)
    if (fx.posterize) {
        posterize()
    }
    if (fx.brightness) {
        setBrightness(fx.brightness)
    }
    if (fx.contrast) {
        setContrast(fx.contrast)
    }
    if (fx.milkify) {
        milkify()
    }
    updateImg()
}

function updateImg() {
    c.convertToBlob()
        .then((blob) => $("#milkCanvas")[0].src = URL.createObjectURL(blob));

}

addEventListener("DOMContentLoaded", init)