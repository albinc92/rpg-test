/**
 * CompressionUtils - LZ-based string compression for map data
 * Uses a custom LZ compression algorithm optimized for base64 strings
 */
class CompressionUtils {
    // Character set for encoding (URL-safe base64 + extended)
    static keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    static keyStrUri = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
    static baseReverseDic = {};

    static getBaseValue(alphabet, character) {
        if (!CompressionUtils.baseReverseDic[alphabet]) {
            CompressionUtils.baseReverseDic[alphabet] = {};
            for (let i = 0; i < alphabet.length; i++) {
                CompressionUtils.baseReverseDic[alphabet][alphabet.charAt(i)] = i;
            }
        }
        return CompressionUtils.baseReverseDic[alphabet][character];
    }

    /**
     * Compress a string to UTF16-encoded compressed string
     * Good for storing in JSON
     */
    static compress(uncompressed) {
        if (uncompressed == null) return "";
        return CompressionUtils._compress(uncompressed, 15, (a) => String.fromCharCode(a + 32));
    }

    /**
     * Decompress a UTF16-encoded compressed string
     */
    static decompress(compressed) {
        if (compressed == null) return "";
        if (compressed === "") return null;
        return CompressionUtils._decompress(compressed.length, 16384, (index) => compressed.charCodeAt(index) - 32);
    }

    /**
     * Compress to base64 string (smaller output, safe for JSON)
     */
    static compressToBase64(input) {
        if (input == null) return "";
        const res = CompressionUtils._compress(input, 6, (a) => CompressionUtils.keyStr.charAt(a));
        switch (res.length % 4) {
            case 0: return res;
            case 1: return res + "===";
            case 2: return res + "==";
            case 3: return res + "=";
        }
    }

    /**
     * Decompress from base64 string
     */
    static decompressFromBase64(input) {
        if (input == null) return "";
        if (input === "") return null;
        return CompressionUtils._decompress(input.length, 32, (index) => 
            CompressionUtils.getBaseValue(CompressionUtils.keyStr, input.charAt(index)));
    }

    /**
     * Compress to URI-safe base64 (no padding)
     */
    static compressToEncodedURIComponent(input) {
        if (input == null) return "";
        return CompressionUtils._compress(input, 6, (a) => CompressionUtils.keyStrUri.charAt(a));
    }

    /**
     * Decompress from URI-safe base64
     */
    static decompressFromEncodedURIComponent(input) {
        if (input == null) return "";
        if (input === "") return null;
        input = input.replace(/ /g, "+");
        return CompressionUtils._decompress(input.length, 32, (index) => 
            CompressionUtils.getBaseValue(CompressionUtils.keyStrUri, input.charAt(index)));
    }

    static _compress(uncompressed, bitsPerChar, getCharFromInt) {
        if (uncompressed == null) return "";
        
        let i, value;
        const context_dictionary = {};
        const context_dictionaryToCreate = {};
        let context_c = "";
        let context_wc = "";
        let context_w = "";
        let context_enlargeIn = 2;
        let context_dictSize = 3;
        let context_numBits = 2;
        let context_data = [];
        let context_data_val = 0;
        let context_data_position = 0;

        for (let ii = 0; ii < uncompressed.length; ii++) {
            context_c = uncompressed.charAt(ii);
            if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
                context_dictionary[context_c] = context_dictSize++;
                context_dictionaryToCreate[context_c] = true;
            }

            context_wc = context_w + context_c;
            if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
                context_w = context_wc;
            } else {
                if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                    if (context_w.charCodeAt(0) < 256) {
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1);
                            if (context_data_position === bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                        }
                        value = context_w.charCodeAt(0);
                        for (i = 0; i < 8; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position === bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    } else {
                        value = 1;
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1) | value;
                            if (context_data_position === bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = 0;
                        }
                        value = context_w.charCodeAt(0);
                        for (i = 0; i < 16; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position === bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn === 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                    delete context_dictionaryToCreate[context_w];
                } else {
                    value = context_dictionary[context_w];
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn === 0) {
                    context_enlargeIn = Math.pow(2, context_numBits);
                    context_numBits++;
                }
                context_dictionary[context_wc] = context_dictSize++;
                context_w = String(context_c);
            }
        }

        if (context_w !== "") {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1);
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 8; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                } else {
                    value = 1;
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | value;
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = 0;
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 16; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn === 0) {
                    context_enlargeIn = Math.pow(2, context_numBits);
                    context_numBits++;
                }
                delete context_dictionaryToCreate[context_w];
            } else {
                value = context_dictionary[context_w];
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
            }
            context_enlargeIn--;
            if (context_enlargeIn === 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
            }
        }

        value = 2;
        for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
            } else {
                context_data_position++;
            }
            value = value >> 1;
        }

        while (true) {
            context_data_val = (context_data_val << 1);
            if (context_data_position === bitsPerChar - 1) {
                context_data.push(getCharFromInt(context_data_val));
                break;
            } else {
                context_data_position++;
            }
        }
        return context_data.join('');
    }

    static _decompress(length, resetValue, getNextValue) {
        const dictionary = [];
        let enlargeIn = 4;
        let dictSize = 4;
        let numBits = 3;
        let entry = "";
        let result = [];
        let i;
        let w;
        let c;
        let resb;
        const data = { val: getNextValue(0), position: resetValue, index: 1 };

        for (i = 0; i < 3; i++) {
            dictionary[i] = i;
        }

        let bits = 0;
        let maxpower = Math.pow(2, 2);
        let power = 1;
        while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
        }

        const next = bits;
        switch (next) {
            case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                c = String.fromCharCode(bits);
                break;
            case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                c = String.fromCharCode(bits);
                break;
            case 2:
                return "";
        }
        dictionary[3] = c;
        w = c;
        result.push(c);
        while (true) {
            if (data.index > length) {
                return "";
            }

            bits = 0;
            maxpower = Math.pow(2, numBits);
            power = 1;
            while (power !== maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position === 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }

            switch (c = bits) {
                case 0:
                    bits = 0;
                    maxpower = Math.pow(2, 8);
                    power = 1;
                    while (power !== maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position === 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }

                    dictionary[dictSize++] = String.fromCharCode(bits);
                    c = dictSize - 1;
                    enlargeIn--;
                    break;
                case 1:
                    bits = 0;
                    maxpower = Math.pow(2, 16);
                    power = 1;
                    while (power !== maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position === 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }
                    dictionary[dictSize++] = String.fromCharCode(bits);
                    c = dictSize - 1;
                    enlargeIn--;
                    break;
                case 2:
                    return result.join('');
            }

            if (enlargeIn === 0) {
                enlargeIn = Math.pow(2, numBits);
                numBits++;
            }

            if (dictionary[c]) {
                entry = dictionary[c];
            } else {
                if (c === dictSize) {
                    entry = w + w.charAt(0);
                } else {
                    return null;
                }
            }
            result.push(entry);

            dictionary[dictSize++] = w + entry.charAt(0);
            enlargeIn--;

            if (enlargeIn === 0) {
                enlargeIn = Math.pow(2, numBits);
                numBits++;
            }

            w = entry;
        }
    }

    /**
     * Compress paint layer data for storage
     * Adds 'lz:' prefix to indicate compressed data
     * @param {string} dataURL - The data:image/png;base64,... string
     * @returns {string} Compressed string with 'lz:' prefix
     */
    static compressPaintData(dataURL) {
        if (!dataURL) return null;
        
        // Already compressed
        if (dataURL.startsWith('lz:')) return dataURL;
        
        const compressed = CompressionUtils.compressToBase64(dataURL);
        return 'lz:' + compressed;
    }

    /**
     * Decompress paint layer data
     * Handles both compressed ('lz:' prefix) and uncompressed data
     * @param {string} data - Either compressed or raw dataURL
     * @returns {string} Decompressed dataURL
     */
    static decompressPaintData(data) {
        if (!data) return null;
        
        // Check if compressed
        if (data.startsWith('lz:')) {
            return CompressionUtils.decompressFromBase64(data.substring(3));
        }
        
        // Return as-is if not compressed
        return data;
    }

    /**
     * Get compression stats for debugging
     * @param {string} original - Original string
     * @param {string} compressed - Compressed string
     * @returns {Object} Stats about the compression
     */
    static getCompressionStats(original, compressed) {
        const originalSize = original ? original.length : 0;
        const compressedSize = compressed ? compressed.length : 0;
        const ratio = originalSize > 0 ? ((1 - compressedSize / originalSize) * 100).toFixed(1) : 0;
        
        return {
            originalSize,
            compressedSize,
            savedBytes: originalSize - compressedSize,
            compressionRatio: ratio + '%'
        };
    }

    /**
     * Migrate existing maps.json to use compressed paint data
     * Run this from browser console: CompressionUtils.migrateMapData()
     * This will download a new compressed maps.json file
     */
    static async migrateMapData() {
        try {
            console.log('🔄 Starting map data migration...');
            
            // Fetch current maps.json
            const response = await fetch('/data/maps.json');
            const mapsData = await response.json();
            
            let totalOriginalSize = 0;
            let totalCompressedSize = 0;
            let mapsConverted = 0;
            
            // Process each map
            for (const [mapKey, mapData] of Object.entries(mapsData)) {
                if (mapData.paintLayerData) {
                    // Skip if already compressed
                    if (mapData.paintLayerData.startsWith('lz:')) {
                        console.log(`  ⏭️ ${mapKey}: Already compressed`);
                        continue;
                    }
                    
                    const original = mapData.paintLayerData;
                    const compressed = CompressionUtils.compressPaintData(original);
                    
                    totalOriginalSize += original.length;
                    totalCompressedSize += compressed.length;
                    
                    mapData.paintLayerData = compressed;
                    mapsConverted++;
                    
                    const stats = CompressionUtils.getCompressionStats(original, compressed);
                    console.log(`  ✅ ${mapKey}: ${stats.compressionRatio} reduction (${(stats.originalSize/1024).toFixed(1)}KB → ${(stats.compressedSize/1024).toFixed(1)}KB)`);
                }
            }
            
            if (mapsConverted === 0) {
                console.log('✨ All maps already compressed, nothing to migrate!');
                return;
            }
            
            // Create downloadable file
            const jsonString = JSON.stringify(mapsData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'maps.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            const totalSaved = totalOriginalSize - totalCompressedSize;
            const totalRatio = ((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1);
            
            console.log('');
            console.log('📊 Migration Complete!');
            console.log(`   Maps converted: ${mapsConverted}`);
            console.log(`   Total original: ${(totalOriginalSize/1024).toFixed(1)} KB`);
            console.log(`   Total compressed: ${(totalCompressedSize/1024).toFixed(1)} KB`);
            console.log(`   Space saved: ${(totalSaved/1024).toFixed(1)} KB (${totalRatio}%)`);
            console.log('');
            console.log('📁 A new maps.json file has been downloaded.');
            console.log('   Replace your data/maps.json with the downloaded file.');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
        }
    }
}

// Make globally available
window.CompressionUtils = CompressionUtils;
