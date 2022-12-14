"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.raw = exports.transform = void 0;
const schema = require("./schema.json");
const schema_utils_1 = require("schema-utils");
const utils_1 = require("./utils");
const cache_1 = require("./cache");
const loader_utils_1 = require("loader-utils");
const parseQuery_1 = require("./parseQuery");
const DEFAULTS = {
    quality: 85,
    placeholder: false,
    placeholderSize: 40,
	injectPlaceholder: false,
    solid: false,
    name: '[hash]-[width].[ext]',
    steps: 4,
    esModule: false,
    emitFile: true,
    rotate: 0,
    cacheDirectory: false,
    cacheCompression: true,
    cacheIdentifier: '',
};
/**
 * **Responsive Loader**
 *
 * Creates multiple images from one source image, and returns a srcset
 * [Responsive Loader](https://github.com/dazuaz/responsive-loader)
 *
 * @param {Buffer} content Source
 *
 * @return {loaderCallback} loaderCallback Result
 */
function loader(content) {
    const loaderCallback = this.async();
    if (typeof loaderCallback == 'undefined') {
        new Error('Responsive loader callback error');
        return;
    }
    // Parsers the query string and options
    const parsedResourceQuery = this.resourceQuery ? (0, parseQuery_1.parseQuery)(decodeURIComponent(this.resourceQuery)) : {};
    // Combines defaults, webpack options and query options,
    const options = { ...DEFAULTS, ...this.getOptions(), ...parsedResourceQuery };
    (0, schema_utils_1.validate)(schema, options, { name: 'Responsive Loader' });
    const outputContext = options.context || this.rootContext;
    const { mime, ext, name, sizes, outputPlaceholder, injectPlaceholder, solid, placeholderSize, imageOptions, cacheOptions, quality } = (0, utils_1.parseOptions)(this.resourcePath, options);
    if (!mime) {
        loaderCallback(new Error('No mime type for file with extension ' + ext + ' supported'));
        return;
    }

    const createFile = ({ data, width, height }) => {

        let fileName = (0, loader_utils_1.interpolateName)(this, name, {
            context: outputContext,
            content: data.toString(),
        })
            .replace(/\[width\]/gi, width + '')
            .replace(/\[height\]/gi, height + '')
			.replace(/\[quality\]/gi, options.quality + '');

		if ( options.injectPlaceholder ) {
			fileName = fileName.slice( 0, -5 ) + "-placeholder" + fileName.slice( -5 );
		}

        if ( options.solid ) {
			fileName = fileName.slice( 0, -5 ) + "-solid-placeholder" + fileName.slice( -5 );
		}

        const { outputPath, publicPath } = (0, utils_1.getOutputAndPublicPath)(fileName, {
            outputPath: options.outputPath,
            publicPath: options.publicPath,
        });
        if (options.emitFile) {
            this.emitFile(outputPath, data);
        }
        return {
            src: publicPath + `+${JSON.stringify(` ${width}w`)}`,
            path: publicPath,
            width: width,
            height: height,
        };
    };
    /**
     * Disable processing of images by this loader (useful in development)
     */
    if (options.disable) {
        const { path } = createFile({ data: content, width: 100, height: 100 });
        loaderCallback(null, `${options.esModule ? 'export default' : 'module.exports ='} {
        srcSet: ${path},
        images: [{path:${path},width:100,height:100}],
        src: ${path},
        toString: function(){return ${path}}
      }`);
        return;
    }
    // The full config is passed to the adapter, later sources' properties overwrite earlier ones.
    const adapterOptions = Object.assign({}, options, imageOptions);
    const transformParams = {
        adapterModule: options.adapter,
        resourcePath: this.resourcePath,
        adapterOptions,
        createFile,
        outputPlaceholder,
        placeholderSize,
		injectPlaceholder: options.injectPlaceholder,
        solid,
        mime,
        sizes,
    };
    orchestrate({ cacheOptions, transformParams })
        .then((result) => loaderCallback(null, result))
        .catch((err) => loaderCallback(err));
}
exports.default = loader;
async function orchestrate(params) {
    // use cached, or create new image.
    let result;
    const { transformParams, cacheOptions } = params;
    if (cacheOptions.cacheDirectory) {
        result = await (0, cache_1.cache)(cacheOptions, transformParams);
    }
    else {
        result = await transform(transformParams);
    }
    return result;
}
// Transform based on the parameters
async function transform({ adapterModule, resourcePath, createFile, sizes, mime, outputPlaceholder, placeholderSize, injectPlaceholder, solid, adapterOptions }) {

	outputPlaceholder = false;

	const adapter = adapterModule || require('./adapters/sharp');
    const img = adapter(resourcePath);
    const results = await transformations({ img, sizes, mime, outputPlaceholder, placeholderSize, adapterOptions });
    let placeholder;
    let files;
    if (outputPlaceholder) {
        files = results.slice(0, -1).map(createFile);
        placeholder = (0, utils_1.createPlaceholder)(results[results.length - 1], mime);
    }
    else {
        files = results.map(createFile);
    }
    const srcset = files.map((f) => f.src).join('+","+');
    const images = files.map((f) => `{path: ${f.path},width: ${f.width},height: ${f.height}}`).join(',');

    // default to the biggest image
    const defaultImage = files[files.length - 1];
    return `${adapterOptions.esModule ? 'export default' : 'module.exports ='} {
        srcSet: ${srcset},
        images: [${images}],
        src: ${defaultImage.path},
        toString: function(){return ${ injectPlaceholder ? (0, utils_1.createPlaceholder)(results[0], mime) : defaultImage.path }},
        ${placeholder ? 'placeholder: ' + placeholder + ',' : ''}
        width: ${defaultImage.width},
        height: ${defaultImage.height}
      }`;
}
exports.transform = transform;
/**
 * **Run Transformations**
 *
 * For each size defined in the parameters, resize an image via the adapter
 *
 */
async function transformations({ img, sizes, mime, outputPlaceholder, placeholderSize, adapterOptions }) {
    const metadata = await img.metadata();
    const promises = [];
    const widthsToGenerate = new Set();
    sizes.forEach((size) => {
        const width = Math.min(metadata.width, size);
        // Only resize images if they aren't an exact copy of one already being resized...
        if (!widthsToGenerate.has(width)) {
            widthsToGenerate.add(width);
            promises.push(img.resize({
                width,
                mime,
                options: adapterOptions,
            }));
        }
    });
    if (outputPlaceholder) {
        promises.push(img.resize({
            width: placeholderSize,
            options: adapterOptions,
            mime,
        }));
    }
    return Promise.all(promises);
}
exports.raw = true;
