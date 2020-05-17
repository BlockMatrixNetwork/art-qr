import { SVG } from '@svgdotjs/svg.js';
const { createCanvas } = require('canvas');

function Drawing(htOption) {
  this._bIsPainted = false;
  this._htOption = htOption;
  this._elSvg = SVG();
  this._elSvgDefs = this._elSvg.defs();
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

  var margin = Math.ceil(rawMargin);
  var rawViewportSize = rawSize - 2 * rawMargin;
  var nSize = Math.ceil(rawViewportSize / (nCount + 1));
  var viewportSize = nSize * nCount;
  var size = viewportSize + 2 * margin;

  // Create background def

  var gradient = this._elSvg.gradient('linear', function(add) {
    const bgC = _htOption.backgroundColor;
    if (
      typeof _htOption.backgroundColor === 'object' &&
      _htOption.backgroundColor.type
    ) {
      for (let i = 0, l = bgC.colors.length; i < l; i++) {
        add.stop(bgC.stops[i] / 100, bgC.colors[i]);
      }
    } else {
      add.stop(0, _htOption.backgroundColor);
    }
  });

  this._elSvgDefs.add(gradient);

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
  if (_htOption.logoImage !== undefined) {
    let logoScale = _htOption.logoScale;
    let logoMargin = _htOption.logoMargin;
    if (logoScale <= 0 || logoScale >= 1.0) {
      logoScale = 0.2;
    }
    if (logoMargin < 0) {
      logoMargin = 0;
    }

    logoSize = viewportSize * logoScale;
    logoX = 0.5 * (size - logoSize);
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
          nSize * (col + 1) > logoX - nSize &&
          nSize * (col + 1) < logoX + logoSize + nSize &&
          (nSize * (row + 1) > logoX - nSize &&
            nSize * (row + 1) < logoX + logoSize + nSize);
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
    let logoScale = _htOption.logoScale;
    let logoMargin = _htOption.logoMargin;
    let logoCornerRadius = _htOption.logoCornerRadius;
    if (logoScale <= 0 || logoScale >= 1.0) {
      logoScale = 0.2;
    }
    if (logoMargin < 0) {
      logoMargin = 0;
    }
    if (logoCornerRadius < 0) {
      logoCornerRadius = 0;
    }
    _bContext.save();

    const logoSize = viewportSize * logoScale;
    const x = 0.5 * (size - logoSize);
    const y = x;
    logoCornerRadius = logoSize / 2;

    _prepareRoundedCornerClip(
      _bContext,
      x - logoMargin,
      y - logoMargin,
      logoSize + 2 * logoMargin,
      logoSize + 2 * logoMargin,
      logoCornerRadius
    );
    _bContext.clip();
    _bContext.fillStyle = '#FFFFFF';
    _bContext.fill();
    _prepareRoundedCornerClip(
      _bContext,
      x,
      y,
      logoSize,
      logoSize,
      logoCornerRadius
    );
    _bContext.clip();
    _bContext.drawImage(_htOption.logoImage, x, y, logoSize, logoSize);
    _bContext.restore();
    if (_htOption.logoService) {
      _bContext.save();
      const serviceSize = logoSize * 0.35;
      const serviceMargin = serviceSize * 0.12;

      _roundRect(
        _bContext,
        x + logoSize - logoMargin - serviceSize,
        y + logoSize - logoMargin - serviceSize,
        serviceSize + serviceMargin * 2,
        serviceSize / 2 + serviceMargin * 2
      );
      _bContext.fillStyle = '#FFFFFF';
      _bContext.fill();

      _roundRect(
        _bContext,
        x + logoSize - logoMargin - serviceSize + serviceMargin,
        y + logoSize - logoMargin - serviceSize + serviceMargin,
        serviceSize,
        serviceSize / 2 + serviceMargin
      );
      _bContext.clip();
      _bContext.drawImage(
        _htOption.logoService,
        x + logoSize - logoMargin - serviceSize + serviceMargin,
        y + logoSize - logoMargin - serviceSize + serviceMargin,
        serviceSize,
        serviceSize
      );
      _bContext.restore();
    }
  }

  // Fill background to white
  _bContext.restore();
  _bContext.globalCompositeOperation = 'destination-over';
  _roundRect(_bContext, 0, 0, size, 15);
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
    this._callback(this._elSvg);
  }
  if (this._bindElement !== undefined) {
    try {
      var el = document.getElementById(this._bindElement);
      el.innerHTML = this._elSvg;
    } catch (e) {
      console.error(e);
    }
  }
};

Drawing.prototype.isPainted = function() {
  return this._bIsPainted;
};

Drawing.prototype.clear = function() {
  this._elSvg.clear();
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

export default Drawing;
