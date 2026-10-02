const https = require('https');

async function getTranscript(videoId) {
    return new Promise((resolve, reject) => {
        https.get(`https://www.youtube.com/watch?v=${videoId}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const match = data.match(/"captions":\{"playerCaptionsTracklistRenderer":\{"captionTracks":\[\{"baseUrl":"([^"]+)"/);
                if (match && match[1]) {
                    const captionUrl = match[1].replace(/\\u0026/g, '&');
                    
                    // Fetch the caption URL
                    https.get(captionUrl, (capRes) => {
                        let capData = '';
                        capRes.on('data', c => capData += c);
                        capRes.on('end', () => resolve(capData));
                    }).on('error', reject);
                } else {
                    reject(new Error('No captions found in HTML'));
                }
            });
        }).on('error', reject);
    });
}

getTranscript('RKK7wGAYP6k').then(xml => console.log('XML snippet:', xml.substring(0, 300))).catch(err => console.error(err.message));
