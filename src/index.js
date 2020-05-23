/* eslint-disable prettier/prettier */
import QRCodeModel from './QRCodeModel';
import { QRErrorCorrectLevel } from './constant';
const { createCanvas } = require('canvas');

function Drawing(htOption) {
  this._bIsPainted = false;
  this._htOption = htOption;
  this._elCanvas = createCanvas(htOption.size, htOption.size);
  this._oContext = this._elCanvas.getContext('2d');
  this._bIsPainted = false;
  this._bSupportDataURI = null;
  this._callback = htOption.callback;
  this._bindElement = htOption.bindElement;
}

Drawing.prototype.draw = function(oQRCode) {
  var _htOption = this._htOption;
  var nCount = oQRCode.getModuleCount();
  var rawSize = _htOption.size;
  var rawMargin = _htOption.margin;
  if (rawMargin < 0 || rawMargin * 2 >= rawSize) {
    rawMargin = 0;
  }

  var margin = rawMargin;
  var borderRadius = _htOption.borderRadius;
  var rawViewportSize = rawSize - 2 * rawMargin;
  var nSize = rawViewportSize / nCount;
  var viewportSize = nSize * nCount;
  var size = viewportSize + 2 * margin;

  var _tCanvas = createCanvas(size, size);
  var _oContext = _tCanvas.getContext('2d');

  var dotScale = _htOption.dotScale;
  this.clear();

  if (dotScale <= 0 || dotScale > 1) {
    throw new Error('Scale should be in range (0, 1).');
  }
  // Leave room for margin
  _oContext.save();
  _oContext.translate(margin, margin);

  var xyOffset = (1 - dotScale) * 0.5;
  let logoSize = 0;
  let logoX = 0;
  let logoScale = _htOption.logoScale;
  let logoMargin = _htOption.logoMargin;
  if (_htOption.logoImage !== undefined) {
    if (logoScale <= 0 || logoScale >= 1.0) {
      logoScale = 0.2;
    }

    logoSize = viewportSize * logoScale;
    logoX = 0.5 * (viewportSize - logoSize);
    if (logoMargin <= 0) {
      logoMargin = logoSize * 0.2;
    }
  }

  for (let row = 0; row < nCount; row++) {
    for (let col = 0; col < nCount; col++) {
      let bIsDark = oQRCode.isDark(row, col);
      if (!bIsDark) continue;

      let isBlkPosCtr =
        (col < 8 && (row < 8 || row >= nCount - 8)) ||
        (col >= nCount - 8 && row < 8);

      let isImgOvr = false;
      if (_htOption.logoImage) {
        isImgOvr =
          nSize * col + logoMargin > logoX &&
          nSize * col - logoMargin < logoX + logoSize &&
          (nSize * row + logoMargin > logoX &&
            nSize * row - logoMargin < logoX + logoSize);
      }
      let bProtected = isBlkPosCtr || isImgOvr;

      let nLeft = col * nSize + (bProtected ? 0 : xyOffset * nSize);
      let nTop = row * nSize + (bProtected ? 0 : xyOffset * nSize);
      _oContext.strokeStyle = bIsDark
        ? _htOption.colorDark
        : _htOption.colorLight;
      _oContext.lineWidth = 0.5;
      _oContext.fillStyle = bIsDark
        ? _htOption.colorDark
        : _htOption.colorLight;
      if (!bProtected) {
        _fillRect(
          _oContext,
          nLeft,
          nTop,
          (bProtected ? 1 : dotScale) * nSize,
          (bProtected ? 1 : dotScale) * nSize,
          _htOption.blockStyle
        );
      }
    }
  }

  // Draw POSITION patterns
  _oContext.fillStyle = _htOption.colorEyes || _htOption.colorDark;
  // Outer eyes
  if (_htOption.eyeImage === undefined) {
    _drawEye(_oContext, nSize, 0, 0, '#000', '#FFF');
    _drawEye(_oContext, nSize, 0, (nCount - 7) * nSize, '#000', '#FFF');
    _drawEye(_oContext, nSize, (nCount - 7) * nSize, 0, '#000', '#FFF');
  } else {
    _oContext.drawImage(_htOption.eyeImage, 0, 0, 7 * nSize, 7 * nSize);
    _oContext.drawImage(
      _htOption.eyeImage,
      (nCount - 7) * nSize,
      0,
      7 * nSize,
      7 * nSize
    );
    _oContext.drawImage(
      _htOption.eyeImage,
      0,
      (nCount - 7) * nSize,
      7 * nSize,
      7 * nSize
    );
  }

  // Drawing background
  var _bkgCanvas = createCanvas(size, size);
  var _bContext = _bkgCanvas.getContext('2d');
  // Adding already drawing screen as clip path
  if (
    typeof _htOption.backgroundColor === 'object' &&
    _htOption.backgroundColor.type
  ) {
    let gradient = _oContext.createLinearGradient(0, 0, size, size);
    const bgC = _htOption.backgroundColor;
    for (let i = 0, l = bgC.colors.length; i < l; i++) {
      gradient.addColorStop(bgC.stops[i] / 100, bgC.colors[i]);
    }

    _bContext.rect(0, 0, size, size);
    _bContext.fillStyle = gradient;
    _bContext.fill();
  } else if (_htOption.backgroundImage !== undefined) {
    _bContext.drawImage(
      _htOption.backgroundImage,
      0,
      0,
      _htOption.backgroundImage.width,
      _htOption.backgroundImage.height,
      0,
      0,
      size,
      size
    );
  } else {
    _bContext.rect(0, 0, size, size);
    _bContext.fillStyle = _htOption.backgroundColor || '#ffffff';
    _bContext.fill();
  }

  _bContext.globalCompositeOperation = 'destination-in';
  _bContext.fillStyle = '#FFFFFF';
  _bContext.drawImage(_tCanvas, 0, 0, rawSize, rawSize);
  _bContext.globalCompositeOperation = 'source-over';

  // Drawing logo
  if (_htOption.logoImage !== undefined) {
    let logoCornerRadius = _htOption.logoCornerRadius;
    if (typeof logoCornerRadius !== 'number' || logoCornerRadius < 0) {
      logoCornerRadius = logoSize / 2;
    } else {
      logoCornerRadius = parseInt(logoCornerRadius);
    }
    _bContext.save();

    _prepareRoundedCornerClip(
      _bContext,
      logoX + margin,
      logoX + margin,
      logoSize,
      logoSize,
      logoCornerRadius
    );
    _bContext.clip();
    _bContext.drawImage(
      _htOption.logoImage,
      logoX + margin,
      logoX + margin,
      logoSize,
      logoSize
    );
    _bContext.restore();
    if (_htOption.logoService) {
      _bContext.save();
      const serviceSize = logoSize * 0.35;
      const serviceMargin = serviceSize * 0.12;

      _roundRect(
        _bContext,
        logoX + margin + logoSize - serviceSize,
        logoX + margin + logoSize - serviceSize,
        serviceSize + serviceMargin * 2,
        serviceSize / 2 + serviceMargin * 2
      );
      _bContext.fillStyle = '#FFFFFF';
      _bContext.fill();

      _roundRect(
        _bContext,
        logoX + margin + logoSize - serviceSize + serviceMargin,
        logoX + margin + logoSize - serviceSize + serviceMargin,
        serviceSize,
        serviceSize / 2 + serviceMargin
      );
      _bContext.clip();
      _bContext.drawImage(
        _htOption.logoService,
        logoX + margin + logoSize - serviceSize + serviceMargin,
        logoX + margin + logoSize - serviceSize + serviceMargin,
        serviceSize,
        serviceSize
      );
      _bContext.restore();
    }
  }

  // Fill background to white
  _bContext.restore();
  _bContext.globalCompositeOperation = 'destination-over';
  _roundRect(_bContext, 0, 0, size, borderRadius);
  _bContext.fillStyle = '#FFFFFF';
  _bContext.fill();

  _bContext.restore();

  // Scale the final image
  let _fCanvas = createCanvas(rawSize, rawSize);
  let _fContext = _fCanvas.getContext('2d');
  _fContext.drawImage(_bkgCanvas, 0, 0, rawSize, rawSize);
  this._elCanvas = _bkgCanvas;

  // Painting work completed
  this._bIsPainted = true;
  if (this._callback !== undefined) {
    this._callback(this._elCanvas.toDataURL());
  }
  if (this._bindElement !== undefined) {
    try {
      var el = document.getElementById(this._bindElement);
      if (el.nodeName === 'IMG') {
        el.src = this._elCanvas.toDataURL();
      } else {
        var elStyle = el.style;
        elStyle['background-image'] = 'url(' + this._elCanvas.toDataURL() + ')';
        elStyle['background-size'] = 'contain';
        elStyle['background-repeat'] = 'no-repeat';
      }
    } catch (e) {
      console.error(e);
    }
  }
};

Drawing.prototype.isPainted = function() {
  return this._bIsPainted;
};

Drawing.prototype.clear = function() {
  this._oContext.clearRect(0, 0, this._elCanvas.width, this._elCanvas.height);
  this._bIsPainted = false;
};

function _prepareRoundedCornerClip(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function _fillRect(canvas, x, y, w, h, blockStyle) {
  if (blockStyle === undefined || blockStyle === 'square') {
    canvas.fillRect(x, y, w, h);
  } else if (blockStyle === 'circle') {
    let centerX = x + w / 2;
    let centerY = y + h / 2;
    let radius = h / 2;
    canvas.beginPath();
    canvas.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    canvas.fill();
  }
}

/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} size The width of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object
 *                 to specify different radii for corners
 */
function _roundRect(ctx, x, y, size, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + size - radius, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
  ctx.lineTo(x + size, y + size - radius);
  ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
  ctx.lineTo(x + radius, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draws a eye of qr code.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} nSize size of QR code dot
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {String} [dark] Whether to color fill of rectangle.
 * @param {String} [white] Whether to color white of rectangle.
 */
function _drawEye(ctx, nSize, x, y, dark, white) {
  let xe, ye, size, radius;
  ctx.save();
  ctx.globalCompositeOperation = 'xor';
  radius = nSize * 2;
  xe = x;
  ye = y;
  size = nSize * 7;
  _roundRect(ctx, xe, ye, size, radius);
  ctx.fillStyle = dark;
  ctx.fill();

  radius = nSize;
  xe = x + nSize * 1;
  ye = y + nSize * 1;
  size = nSize * 5;

  _roundRect(ctx, xe, ye, size, radius);
  ctx.fillStyle = white;
  ctx.fill();

  ctx.restore();
  radius = nSize / 2;
  xe = x + nSize * 2;
  ye = y + nSize * 2;
  size = nSize * 3;
  _roundRect(ctx, xe, ye, size, radius);
  ctx.fillStyle = dark;
  ctx.fill();
}

const AwesomeQRCode = function() {};

AwesomeQRCode.prototype.create = function(vOption) {
  this._htOption = {
    size: 320,
    margin: 20,
    borderRadius: 20,
    typeNumber: 4,
    colorEyes: undefined,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRErrorCorrectLevel.M,
    backgroundImage: undefined,
    backgroundColor: '#ffffff',
    logoImage: undefined,
    logoScale: 0.2,
    logoMargin: 0,
    logoService: false,
    dotScale: 0.35,
    callback: undefined,
    bindElement: undefined,

    blockStyle: 'square',

    outerEyeImage: undefined,
    outerEyeTopLeftRotation: 0,
    outerEyeTopRightRotation: 0,
    outerEyeBottomLeftRotation: 0,

    innerEyeImage: undefined,
    innerEyeTopLeftRotation: 0,
    innerEyeTopRightRotation: 0,
    innerEyeBottomLeftRotation: 0
  };

  if (typeof vOption === 'string') {
    vOption = {
      text: vOption
    };
  }

  if (vOption) {
    for (var i in vOption) {
      this._htOption[i] = vOption[i];
    }
  }

  this._oQRCode = null;
  this._oDrawing = new Drawing(this._htOption);

  if (this._htOption.text) {
    this.makeCode(this._htOption.text);
  }

  return this;
};

AwesomeQRCode.prototype.makeCode = function(sText) {
  this._oQRCode = new QRCodeModel(-1, this._htOption.correctLevel);
  this._oQRCode.addData(sText);
  this._oQRCode.make();
  this._oDrawing.draw(this._oQRCode);
};

AwesomeQRCode.prototype.clear = function() {
  this._oDrawing.clear();
};

AwesomeQRCode.prototype.download = function() {
  const canvas = this._oDrawing._elCanvas;
  downloadURI(canvas.toDataURL(), 'qr-code.png');
};

AwesomeQRCode.CorrectLevel = QRErrorCorrectLevel;

function downloadURI(uri, name) {
  const link = document.createElement('a');
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default AwesomeQRCode;
