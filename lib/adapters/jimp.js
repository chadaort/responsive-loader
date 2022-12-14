"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jimp = require("jimp");
class JimpAdapter {
    constructor(imagePath) {
        this.readImage = jimp.read(imagePath);
    }
    metadata() {
        return this.readImage.then((image) => ({
            width: image.bitmap.width,
            height: image.bitmap.height,
        }));
    }
    resize({ width, mime, options, }) {
        return new Promise((resolve, reject) => {
            this.readImage.then((image) => {
                image
                    .clone()
                    .resize(width, jimp.AUTO)
                    .quality(options.quality)
                    .background(parseInt(options.background + "", 16) || 0xffffffff)
                    .getBuffer(mime, function (err, data) {
                    // eslint-disable-line func-names
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve({
                            data,
                            width,
                            height: this.bitmap.height,
                        });
                    }
                });
            });
        });
    }
}
module.exports = (imagePath) => {
    return new JimpAdapter(imagePath);
};
