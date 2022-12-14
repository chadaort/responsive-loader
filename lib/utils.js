"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlaceholder = exports.getOutputAndPublicPath = exports.parseOptions = void 0;
const path = require("path");
const version = '3';
var MIMES;
(function (MIMES) {
    MIMES["jpg"] = "image/jpeg";
    MIMES["jpeg"] = "image/jpeg";
    MIMES["png"] = "image/png";
    MIMES["webp"] = "image/webp";
    MIMES["avif"] = "image/avif";
})(MIMES || (MIMES = {}));
var EXTS;
(function (EXTS) {
    EXTS["image/jpeg"] = "jpg";
    EXTS["image/png"] = "png";
    EXTS["image/webp"] = "webp";
    EXTS["image/avif"] = "avif";
})(EXTS || (EXTS = {}));
function parseOptions(resourcePath, options) {
    var _a;
    const outputPlaceholder = Boolean(options.placeholder);
    const placeholderSize = parseInt(options.placeholderSize + '', 10);
	const injectPlaceholder = options.injectPlaceholder;
    // Adapter compression options
    const imageOptions = {
        quality: parseInt(options.quality + '', 10),
        rotate: parseInt(options.rotate + '', 10),
        background: options.background,
        progressive: Boolean(options.progressive),
    };
    // let mime: MimeType | undefined
    // let ext: FileExt | string
    let mime;
    let ext;
    if (options.format) {
        mime = MIMES[options.format];
        ext = EXTS[mime];
    }
    else {
        ext = path.extname(resourcePath).replace(/\./, '');
        switch (ext) {
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'webp':
            case 'avif':
                mime = MIMES[ext];
                break;
            default:
                mime = undefined;
                break;
        }
    }

    const name = options.name.replace(/\[ext\]/gi, ext);
    const min = options.min !== undefined ? parseInt(options.min + '', 10) : undefined;
    const max = options.max !== undefined ? parseInt(options.max + '', 10) : undefined;
    const steps = parseInt(options.steps + '', 10);
    let generatedSizes;
    if (typeof min === 'number' && max) {
        generatedSizes = [];
        for (let step = 0; step < steps; step++) {
            const size = min + ((max - min) / (steps - 1)) * step;
            generatedSizes.push(Math.ceil(size));
        }
    }
    const size = parseInt(options.size + '', 10);
    const sizes = size
        ? [size]
        : ((_a = options.sizes) === null || _a === void 0 ? void 0 : _a.map((size) => parseInt(size + '', 10))) || generatedSizes || [Number.MAX_SAFE_INTEGER];
    // Cache options
    const cacheOptions = {
        cacheDirectory: options.cacheDirectory,
        cacheIdentifier: JSON.stringify({
            options,
            'responsive-loader': version,
        }),
        cacheCompression: Boolean(options.cacheCompression),
    };
    return {
        ext,
        mime,
        name,
        sizes,
        outputPlaceholder,
        placeholderSize,
		injectPlaceholder,
        cacheOptions,
        imageOptions,
    };
}
exports.parseOptions = parseOptions;
const createPlaceholder = ({ data }, mime) => {
    return `"data:${mime};base64,${data.toString('base64')}"`;
};
exports.createPlaceholder = createPlaceholder;
/**
 * **Responsive Loader Paths**
 *
 * Returns the output and public path
 *
 * @method getOutputAndPublicPath
 *
 * @param {string} fileName
 * @param {Config} outputPath
 * @param {Config} publicPath
 *
 * @return {Config} Paths Result
 */
const getOutputAndPublicPath = (fileName, { outputPath: configOutputPath, publicPath: configPublicPath }) => {
    let outputPath = fileName;
    if (configOutputPath) {
        if (typeof configOutputPath === 'function') {
            outputPath = configOutputPath(fileName);
        }
        else {
            outputPath = path.posix.join(configOutputPath, fileName);
        }
    }
    let publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)}`;
    if (configPublicPath) {
        if (typeof configPublicPath === 'function') {
            publicPath = configPublicPath(fileName);
        }
        else {
            // publicPath can be a url or local path
            // check if it's a valid url
            if (isValidUrl(configPublicPath)) {
                const url = new URL(configPublicPath);
                url.pathname = path.posix.join(url.pathname, fileName);
                publicPath = url.toString();
            }
            else {
                publicPath = path.posix.join(configPublicPath, fileName);
            }
        }
        publicPath = JSON.stringify(publicPath);
    }
    return {
        outputPath,
        publicPath,
    };
};
exports.getOutputAndPublicPath = getOutputAndPublicPath;
const isValidUrl = (urlString) => {
    try {
        return Boolean(new URL(urlString));
    }
    catch (e) {
        return false;
    }
};
