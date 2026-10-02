const { getSubtitles } = require('youtube-captions-scraper');
getSubtitles({
  videoID: 'RKK7wGAYP6k', 
  lang: 'en' // default: `en`
}).then(captions => {
  console.log('Captions fetched, length:', captions.length);
}).catch(err => {
  console.error('Scraper Error:', err.message);
});
