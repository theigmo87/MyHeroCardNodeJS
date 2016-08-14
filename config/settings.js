var privateSettings = require("./privateSettings.js");

var settings = {
    doPlacesLU: true,
    skipCrawling: false,
    debug: true,
    
    paths: {
        scrapeResultsPath: "./data/scrapeResults.json",
        newScrapeResults: "./data/newScrapeResults.json",
        placesLookupResultsPath: "./data/placesLookupResults.json",
        placesNotFoundPath: "./data/placesNotFound.json",
        firebaseAccountCreds: "./config/firebaseCreds.json"
    },

    crawler: {
        baseUrl: "http://www.myherocard.com/benefit-summary-page/",
        root: '.portfolio',
        scope: [{
            image: 'img@src',
            moreInfoUrl: '.post_more_link a@href',
            phone: 'a[href*="tel:"]@href',
            description: '.post_excerpt' 
        }],
    }, 

    googlePlacesApi: {
        apiKey: {
            myherocard: privateSettings.googlePlacesApiKey
        },
        geoLocationOrigin: {
            downtownAugusta: '33.476038, -81.971949',
            evans: '33.543160, -82.130621'
        },
        radius: 50000,
        baseUrl: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
    },

    rollbar: {
        sendToRollbar: true,
        accessToken: privateSettings.rollbarAccessToken,
        options: {
            exitOnUncaughtException: true,
        }
    },

    scheduler: {
        cronJobString: "0 0 * * 3"
    },

    firebase: {
        databaseUrl: privateSettings.firebaseUrl,
        uid: privateSettings.firebaseUid
    }
}

module.exports = settings;