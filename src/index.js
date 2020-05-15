/* eslint-disable prettier/prettier */
import QRCodeModel from './QRCodeModel';
import { QRErrorCorrectLevel } from './constant';
import CanvasDraw from './canvasDraw';
import SvgDraw from './svgDraw';

const AwesomeQRCode = function() {};

AwesomeQRCode.prototype.create = function(vOption) {
  this._htOption = {
    size: 320,
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
    logoMargin: 5,
    logoService: false,
    dotScale: 0.35,
    callback: undefined,
    bindElement: undefined,

    blockStyle: 'circle',

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
  this.DrawClass = null;
  switch (this._htOption.imageType) {
    case 'canvas':
      this.DrawClass = CanvasDraw;
      break;
    default:
      this.DrawClass = SvgDraw;
      break;
  }
  this._oDrawing = new this.DrawClass(this._htOption);

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
