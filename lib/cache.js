"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
/**
 * Filesystem Cache
 *
 * Given a file and a transform function, cache the result into files
 * or retrieve the previously cached files if the given file is already known.
 *
 * @see https://github.com/babel/babel-loader/
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const findCacheDir = require("find-cache-dir");
const makeDir = require("make-dir");
const util_1 = require("util");
const _1 = require(".");
// Lazily instantiated when needed
let defaultCacheDirectory = null;
const readFile = (0, util_1.promisify)(fs.readFile);
const writeFile = (0, util_1.promisify)(fs.writeFile);
const gunzip = (0, util_1.promisify)(zlib.gunzip);
const gzip = (0, util_1.promisify)(zlib.gzip);
/**
 * Read the contents from the compressed file.
 *
 * @async
 * @params {String} filename
 * @params {Boolean} compress
 */
const read = async function (filename, compress) {
    const data = await readFile(filename + (compress ? '.gz' : ''));
    const content = compress ? await gunzip(data) : data;
    return JSON.parse(content.toString());
};
/**
 * Write contents into a compressed file.
 *
 * @async
 * @params {String} filename
 * @params {Boolean} compress
 * @params {String} result
 */
const write = async function (filename, compress, result) {
    const content = JSON.stringify(result);
    const data = compress ? await gzip(content) : content;
    return await writeFile(filename + (compress ? '.gz' : ''), data);
};
/**
 * Build the filename for the cached file
 *
 * @params {String} source  File source code
 * @params {Object} options Options used
 *
 * @return {String}
 */
const filename = function (source, identifier) {
    const hash = crypto.createHash('md4');
    const contents = JSON.stringify({ source, identifier });
    hash.update(contents);
    return hash.digest('hex') + '.json';
};
/**
 * Handle the cache
 *
 * @params {String} directory
 * @params {Object} params
 */
const handleCache = async function (directory, cacheOptions, params) {
    const { cacheIdentifier, cacheDirectory, cacheCompression } = cacheOptions;
    const file = path.join(directory, filename(params.resourcePath, cacheIdentifier));
    try {
        // No errors mean that the file was previously cached
        // we just need to return it
        return await read(file, cacheCompression);
    }
    catch (err) {
        // continue regardless of error
    }
    const fallback = typeof cacheDirectory !== 'string' && directory !== os.tmpdir();
    // Make sure the directory exists.
    try {
        await makeDir(directory);
    }
    catch (err) {
        if (fallback) {
            return handleCache(os.tmpdir(), cacheOptions, params);
        }
        throw err;
    }
    // Otherwise just transform the file
    // return it to the user asap and write it in cache
    const result = await (0, _1.transform)(params);
    try {
        await write(file, cacheCompression, result);
    }
    catch (err) {
        if (fallback) {
            // Fallback to tmpdir if node_modules folder not writable
            return handleCache(os.tmpdir(), cacheOptions, params);
        }
        throw err;
    }
    return result;
};
/**
 * Retrieve file from cache, or create a new one for future reads
 *
 * @async
 * @param  {CacheOptions}   cacheOptions
 * @param  {TransformParams}   transformParams  Options to be given to the transform fn
 *
 */
async function cache(cacheOptions, transformParams) {
    let directory;
    if (typeof cacheOptions.cacheDirectory === 'string') {
        directory = cacheOptions.cacheDirectory;
    }
    else {
        if (defaultCacheDirectory === null) {
            defaultCacheDirectory = findCacheDir({ name: 'responsive-loader' }) || os.tmpdir();
        }
        directory = defaultCacheDirectory;
    }
    return await handleCache(directory, cacheOptions, transformParams);
}
exports.cache = cache;
