import QRCodeModel from './QRCodeModel';
import { QRErrorCorrectLevel, QRUtil } from './constant';
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

  var margin = Math.ceil(rawMargin);
  var rawViewportSize = rawSize - 2 * rawMargin;
  var nSize = Math.ceil(rawViewportSize / nCount);
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

  var _bkgCanvas = createCanvas(size, size);
  var _bContext = _bkgCanvas.getContext('2d');
  var _maskCanvas;
  var _mContext;

  if (
    typeof _htOption.backgroundColor === 'object' &&
    _htOption.backgroundColor.from
  ) {
    let gradient = _oContext.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, _htOption.backgroundColor.from);
    gradient.addColorStop(1, _htOption.backgroundColor.to);

    _bContext.rect(0, 0, size, size);
    _bContext.fillStyle = gradient;
    _bContext.fill();
  } else if (_htOption.backgroundImage !== undefined) {
    if (_htOption.autoColor) {
      var avgRGB = getAverageRGB(_htOption.backgroundImage);
      _htOption.colorDark =
        'rgb(' + avgRGB.r + ', ' + avgRGB.g + ', ' + avgRGB.b + ')';
      _htOption.colorEyes =
        'rgb(' + avgRGB.r + ', ' + avgRGB.g + ', ' + avgRGB.b + ')';
    }

    if (_htOption.maskedDots) {
      console.log(_htOption.maskedDots);
      _maskCanvas = createCanvas(size, size);
      _mContext = _maskCanvas.getContext('2d');
      _mContext.drawImage(
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

      _bContext.rect(0, 0, size, size);
      _bContext.fillStyle = '#ffffff';
      _bContext.fill();
    } else {
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
    }
  } else {
    _bContext.rect(0, 0, size, size);
    _bContext.fillStyle = '#ffffff';
    _bContext.fill();
  }

  _oContext.save();
  var agnPatternCenter = QRUtil.getPatternPosition(oQRCode.typeNumber);
  var xyOffset = (1 - dotScale) * 0.5;
  for (let row = 0; row < nCount; row++) {
    for (let col = 0; col < nCount; col++) {
      var bIsDark = oQRCode.isDark(row, col);

      // var isBlkPosCtr = ((col < 8 && (row < 8 || row >= nCount - 8)) || (col >= nCount - 8 && row < 8) || (col < nCount - 4 && col >= nCount - 4 - 5 && row < nCount - 4 && row >= nCount - 4 - 5));
      var isBlkPosCtr =
        (col < 8 && (row < 8 || row >= nCount - 8)) ||
        (col >= nCount - 8 && row < 8);

      var bProtected = row === 6 || col === 6 || isBlkPosCtr;

      for (let i = 0; i < agnPatternCenter.length - 1; i++) {
        bProtected =
          bProtected ||
          (row >= agnPatternCenter[i] - 2 &&
            row <= agnPatternCenter[i] + 2 &&
            col >= agnPatternCenter[i] - 2 &&
            col <= agnPatternCenter[i] + 2);
      }

      let nLeft = col * nSize + (bProtected ? 0 : xyOffset * nSize);
      let nTop = row * nSize + (bProtected ? 0 : xyOffset * nSize);
      _oContext.strokeStyle = bIsDark
        ? _htOption.colorDark
        : _htOption.colorLight;
      _oContext.lineWidth = 0.5;
      _oContext.fillStyle = bIsDark
        ? _htOption.colorDark
        : _htOption.colorLight;
      if (agnPatternCenter.length === 0) {
        // if align pattern list is empty, then it means that we don't need to leave room for the align patterns
        if (!bProtected) {
          _fillRectWithMask(
            _oContext,
            nLeft,
            nTop,
            (bProtected ? (isBlkPosCtr ? 1 : 1) : dotScale) * nSize,
            (bProtected ? (isBlkPosCtr ? 1 : 1) : dotScale) * nSize,
            _maskCanvas,
            bIsDark,
            _htOption.blockStyle
          );
        }
      } else {
        var inAgnRange =
          col < nCount - 4 &&
          col >= nCount - 4 - 5 &&
          row < nCount - 4 &&
          row >= nCount - 4 - 5;
        if (!bProtected && !inAgnRange) {
          _oContext.beginPath();
          _fillRectWithMask(
            _oContext,
            nLeft,
            nTop,
            (bProtected ? (isBlkPosCtr ? 1 : 1) : dotScale) * nSize,
            (bProtected ? (isBlkPosCtr ? 1 : 1) : dotScale) * nSize,
            _maskCanvas,
            bIsDark,
            _htOption.blockStyle
          );
          _oContext.clip();
        }
      }
    }
  }

  // Draw POSITION protectors
  var protectorStyle = 'rgba(255, 255, 255, 0.6)';
  _oContext.fillStyle = protectorStyle;
  _oContext.fillRect(0, 0, 8 * nSize, 8 * nSize);
  _oContext.fillRect(0, (nCount - 8) * nSize, 8 * nSize, 8 * nSize);
  _oContext.fillRect((nCount - 8) * nSize, 0, 8 * nSize, 8 * nSize);
  _oContext.fillRect(8 * nSize, 6 * nSize, (nCount - 8 - 8) * nSize, nSize);
  _oContext.fillRect(6 * nSize, 8 * nSize, nSize, (nCount - 8 - 8) * nSize);

  // Draw ALIGN protectors
  var edgeCenter = agnPatternCenter[agnPatternCenter.length - 1];
  for (let i = 0; i < agnPatternCenter.length; i++) {
    for (let j = 0; j < agnPatternCenter.length; j++) {
      let agnX = agnPatternCenter[j];
      let agnY = agnPatternCenter[i];
      if (agnX === 6 && (agnY === 6 || agnY === edgeCenter)) {
        continue;
      } else if (agnY === 6 && (agnX === 6 || agnX === edgeCenter)) {
        continue;
      } else if (
        agnX !== 6 &&
        agnX !== edgeCenter &&
        agnY !== 6 &&
        agnY !== edgeCenter
      ) {
        _drawAlignProtector(_oContext, agnX, agnY, nSize, nSize);
      } else {
        _drawAlignProtector(_oContext, agnX, agnY, nSize, nSize);
      }
      // console.log("agnX=" + agnX + ", agnY=" + agnX);
    }
  }

  // Draw alignment pattern
  _oContext.fillStyle = _htOption.colorDark;
  for (let i = 0; i < nCount - 16; i += 2) {
    _oContext.fillRect((8 + i) * nSize, 6 * nSize, nSize, nSize);
    _oContext.fillRect(6 * nSize, (8 + i) * nSize, nSize, nSize);
  }

  // Draw POSITION patterns
  _oContext.fillStyle = _htOption.colorEyes || _htOption.colorDark;

  // Outer eyes
  if (_htOption.outerEyeImage === undefined) {
    // Top left eye
    _oContext.fillRect(0, 0, 7 * nSize, nSize);
    _oContext.fillRect(0, 0, nSize, 7 * nSize);
    _oContext.fillRect(6 * nSize, 0, nSize, 7 * nSize);
    _oContext.fillRect(0, 6 * nSize, 7 * nSize, nSize);

    // Bottom left eye
    _oContext.fillRect(0, (nCount - 7) * nSize, nSize, 7 * nSize);
    _oContext.fillRect(0, (nCount - 7) * nSize, 7 * nSize, nSize);
    _oContext.fillRect(0, (nCount - 7 + 6) * nSize, 7 * nSize, nSize);
    _oContext.fillRect(6 * nSize, (nCount - 7) * nSize, nSize, 7 * nSize);

    // Top right eye
    _oContext.fillRect((nCount - 7) * nSize, 6 * nSize, 7 * nSize, nSize);
    _oContext.fillRect((nCount - 7 + 6) * nSize, 0, nSize, 7 * nSize);
    _oContext.fillRect((nCount - 7) * nSize, 0, 7 * nSize, nSize);
    _oContext.fillRect((nCount - 7) * nSize, 0, nSize, 7 * nSize);
  } else {
    _drawAndRotateImage(
      _oContext,
      _htOption.outerEyeImage,
      _htOption.outerEyeTopLeftRotation,
      0,
      0,
      7 * nSize,
      7 * nSize,
      _htOption.colorEyes
    );
    _drawAndRotateImage(
      _oContext,
      _htOption.outerEyeImage,
      _htOption.outerEyeTopRightRotation,
      (nCount - 7) * nSize,
      0,
      7 * nSize,
      7 * nSize,
      _htOption.colorEyes
    );
    _drawAndRotateImage(
      _oContext,
      _htOption.outerEyeImage,
      _htOption.outerEyeBottomLeftRotation,
      0,
      (nCount - 7) * nSize,
      7 * nSize,
      7 * nSize,
      _htOption.colorEyes
    );
  }

  // inner eyes
  if (_htOption.innerEyeImage === undefined) {
    _oContext.fillRect(2 * nSize, 2 * nSize, 3 * nSize, 3 * nSize); // TL
    _oContext.fillRect(
      (nCount - 7 + 2) * nSize,
      2 * nSize,
      3 * nSize,
      3 * nSize
    ); // TR
    _oContext.fillRect(
      2 * nSize,
      (nCount - 7 + 2) * nSize,
      3 * nSize,
      3 * nSize
    ); // BL
  } else {
    _drawAndRotateImage(
      _oContext,
      _htOption.innerEyeImage,
      _htOption.innerEyeTopLeftRotation,
      2 * nSize,
      2 * nSize,
      3 * nSize,
      3 * nSize,
      _htOption.colorEyes
    );
    _drawAndRotateImage(
      _oContext,
      _htOption.innerEyeImage,
      _htOption.innerEyeTopRightRotation,
      (nCount - 7 + 2) * nSize,
      2 * nSize,
      3 * nSize,
      3 * nSize,
      _htOption.colorEyes
    );
    _drawAndRotateImage(
      _oContext,
      _htOption.innerEyeImage,
      _htOption.innerEyeBottomLeftRotation,
      2 * nSize,
      (nCount - 7 + 2) * nSize,
      3 * nSize,
      3 * nSize,
      _htOption.colorEyes
    );
  }

  for (let i = 0; i < agnPatternCenter.length; i++) {
    for (let j = 0; j < agnPatternCenter.length; j++) {
      let agnX = agnPatternCenter[j];
      let agnY = agnPatternCenter[i];
      if (agnX === 6 && (agnY === 6 || agnY === edgeCenter)) {
        continue;
      } else if (agnY === 6 && (agnX === 6 || agnX === edgeCenter)) {
        continue;
      } else if (
        agnX !== 6 &&
        agnX !== edgeCenter &&
        agnY !== 6 &&
        agnY !== edgeCenter
      ) {
        _oContext.fillStyle = 'rgba(0, 0, 0, .2)';
        _drawAlign(_oContext, agnX, agnY, nSize, nSize);
      } else {
        _oContext.fillStyle = _htOption.colorDark;
        _drawAlign(_oContext, agnX, agnY, nSize, nSize);
      }
    }
  }

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

    _oContext.restore();

    let logoSize = viewportSize * logoScale;
    let x = 0.5 * (size - logoSize);
    let y = x;

    _oContext.fillStyle = '#FFFFFF';
    _oContext.save();
    _prepareRoundedCornerClip(
      _oContext,
      x - logoMargin,
      y - logoMargin,
      logoSize + 2 * logoMargin,
      logoSize + 2 * logoMargin,
      logoCornerRadius
    );
    _oContext.clip();
    _oContext.fill();
    _oContext.restore();

    _oContext.save();
    _prepareRoundedCornerClip(
      _oContext,
      x,
      y,
      logoSize,
      logoSize,
      logoCornerRadius
    );
    _oContext.clip();
    _oContext.drawImage(_htOption.logoImage, x, y, logoSize, logoSize);
    _oContext.restore();
  }

  // Swap and merge the foreground and the background
  _bContext.drawImage(_tCanvas, 0, 0, size, size);
  _oContext.drawImage(_bkgCanvas, -margin, -margin, size, size);

  // Scale the final image
  let _fCanvas = createCanvas(rawSize, rawSize);
  let _fContext = _fCanvas.getContext('2d');
  _fContext.drawImage(_tCanvas, 0, 0, rawSize, rawSize);
  this._elCanvas = _fCanvas;

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

Drawing.prototype.round = function(nNumber) {
  if (!nNumber) {
    return nNumber;
  }

  return Math.floor(nNumber * 1000) / 1000;
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

function _fillRectWithMask(canvas, x, y, w, h, maskSrc, bDark, blockStyle) {
  // console.log("maskSrc=" + maskSrc);
  if (maskSrc === undefined) {
    if (blockStyle === undefined || blockStyle === 'square') {
      canvas.fillRect(x, y, w, h);
    } else if (blockStyle === 'circle') {
      let centerX = x + w / 2;
      let centerY = y + h / 2;
      let radius = h / 2;

      canvas.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    }
  } else {
    canvas.drawImage(maskSrc, x, y, w, h, x, y, w, h);
    var fill_ = canvas.fillStyle;
    canvas.fillStyle = bDark ? 'rgba(0, 0, 0, .5)' : 'rgba(255, 255, 255, .7)';
    canvas.fillRect(x, y, w, h);
    canvas.fillStyle = fill_;
  }
}

function _drawAlignProtector(context, centerX, centerY, nWidth, nHeight) {
  context.clearRect(
    (centerX - 2) * nWidth,
    (centerY - 2) * nHeight,
    5 * nWidth,
    5 * nHeight
  );
  context.fillRect(
    (centerX - 2) * nWidth,
    (centerY - 2) * nHeight,
    5 * nWidth,
    5 * nHeight
  );
}

function _drawAlign(context, centerX, centerY, nWidth, nHeight) {
  context.fillRect(
    (centerX - 2) * nWidth,
    (centerY - 2) * nHeight,
    nWidth,
    4 * nHeight
  );
  context.fillRect(
    (centerX + 2) * nWidth,
    (centerY - 2 + 1) * nHeight,
    nWidth,
    4 * nHeight
  );
  context.fillRect(
    (centerX - 2 + 1) * nWidth,
    (centerY - 2) * nHeight,
    4 * nWidth,
    nHeight
  );
  context.fillRect(
    (centerX - 2) * nWidth,
    (centerY + 2) * nHeight,
    4 * nWidth,
    nHeight
  );
  context.fillRect(centerX * nWidth, centerY * nHeight, nWidth, nHeight);
}

function _drawImageWithColor(
  context,
  image,
  positionX,
  positionY,
  sizeX,
  sizeY,
  fillStyle
) {
  // Create a temporary canvas to recolour the image
  var tmpCanvas = createCanvas(sizeX, sizeY);
  var tmpCtx = tmpCanvas.getContext('2d');

  tmpCtx.drawImage(image, 0, 0, sizeX, sizeY);

  tmpCtx.globalCompositeOperation = 'source-in';
  tmpCtx.fillStyle = fillStyle;
  tmpCtx.fillRect(0, 0, sizeX, sizeY);

  // Draw the temporary canvas onto the main context
  context.drawImage(tmpCanvas, positionX, positionY);
}

function _drawAndRotateImage(
  context,
  image,
  angleInDegress,
  positionX,
  positionY,
  sizeX,
  sizeY,
  color
) {
  // 110% credit to this article:
  // http://creativejs.com/2012/01/day-10-drawing-rotated-images-into-canvas/index.html

  if (angleInDegress === 0) {
    context.drawImage(image, positionX, positionY, sizeX, sizeY);
  }

  let TO_RADIANS = Math.PI / 180;
  let halfSizeX = sizeX / 2;
  let halfSizeY = sizeY / 2;

  context.translate(positionX, positionY);
  context.translate(halfSizeX, halfSizeY);
  context.rotate(angleInDegress * TO_RADIANS);

  if (color !== undefined) {
    _drawImageWithColor(
      context,
      image,
      -halfSizeX,
      -halfSizeY,
      sizeX,
      sizeY,
      color
    );
  } else {
    context.drawImage(image, -halfSizeX, -halfSizeY, sizeX, sizeY);
  }

  context.rotate(angleInDegress * TO_RADIANS * -1);
  context.translate(-halfSizeX, -halfSizeY);
  context.translate(-positionX, -positionY);
}

const AwesomeQRCode = function() {};

AwesomeQRCode.prototype.create = function(vOption) {
  this._htOption = {
    size: 800,
    margin: 20,
    typeNumber: 4,
    colorEyes: undefined,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRErrorCorrectLevel.M,
    backgroundImage: undefined,
    backgroundColor: '#ffffff',
    logoImage: undefined,
    logoScale: 0.2,
    logoMargin: 6,
    logoCornerRadius: 8,
    dotScale: 0.35,
    maskedDots: false,
    autoColor: true,
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
  downloadURI(canvas.toDataURL(), 'qrcode.png');
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

function getAverageRGB(imgEl) {
  const blockSize = 5;
  const defaultRGB = {
    r: 0,
    g: 0,
    b: 0
  };
  let data;
  let width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;
  let height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
  let i = -4;
  let length;
  let rgb = {
    r: 0,
    g: 0,
    b: 0
  };
  let count = 0;

  const canvas = createCanvas(height, width);
  const context = canvas.getContext && canvas.getContext('2d');

  if (!context) {
    return defaultRGB;
  }

  context.drawImage(imgEl, 0, 0);

  try {
    data = context.getImageData(0, 0, width, height);
  } catch (e) {
    return defaultRGB;
  }

  length = data.data.length;

  while ((i += blockSize * 4) < length) {
    if (
      data.data[i] > 200 ||
      data.data[i + 1] > 200 ||
      data.data[i + 2] > 200
    ) {
      continue;
    }
    ++count;
    rgb.r += data.data[i];
    rgb.g += data.data[i + 1];
    rgb.b += data.data[i + 2];
  }

  rgb.r = ~~(rgb.r / count);
  rgb.g = ~~(rgb.g / count);
  rgb.b = ~~(rgb.b / count);

  return rgb;
}

export default AwesomeQRCode;
