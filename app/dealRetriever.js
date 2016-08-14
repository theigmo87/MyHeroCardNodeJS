var rollbar = require('rollbar');
var deepEqual = require('deep-equal');
var fileExists = require('file-exists');

var placesLU = require("./googlePlacesLookup.js");
var settings = require("../config/settings.js");
var writeToFile = require("../utils/writeToFile.js");
var webCrawler = require("./webCrawler.js");
var db = require("./firebaseWrapper.js");

var existingScrapeResults;
if (fileExists(settings.paths.scrapeResultsPath))
    existingScrapeResults = require("../" + settings.paths.scrapeResultsPath);
var existingNewScrapeResults;
if (fileExists(settings.paths.newScrapeResults))
    existingNewScrapeResults = require("../" + settings.paths.newScrapeResults);

var returnCallback;

var dealRetriever = {
    getDeals: getDeals
}

function getDeals(callback){
    returnCallback = callback;
    if (settings.skipCrawling)
        placesLookup(existingScrapeResults.crawlData);
    else
        webCrawler.crawlPage(crawlComplete);
    callback(null);
}

function crawlComplete(err, response){
    logger("crawling my hero card website complete");
    if (err)
        handleError("error crawling site", err);
    else{
        var origData = response;
        var crawlData = massageData(response);

        var newEqualsExisting = (existingScrapeResults && deepEqual(crawlData, existingScrapeResults)) || false;
        var newEqualsExistingNew = (existingNewScrapeResults && deepEqual(crawlData, existingNewScrapeResults.crawlData)) || false;

        if (newEqualsExisting || newEqualsExistingNew)
            placesLookup(existingScrapeResults);
        else{
            var results = {
                timeStamp: new Date().toString(),
                newCrawlData: crawlData
            }

            logger("crawled results don't match the saved new scraped data: ", results);

            save(settings.paths.newScrapeResults, results, function(err){
                if (err)
                    handleError("error saving new scrape results", err);
                else{
                    db.saveNewScrapedResults(results, function(err){
                        if (err)
                            handleError("error saving new scrape results to firebase", err);
                        else{
                            logger("finished saving scrape results to firebase");
                            placesLookup(existingScrapeResults);
                        }
                    });
                }
            });
        }
    }
}

function placesLookup(data){
    if (settings.doPlacesLU && data){
        logger("looking up crawled data in google places api");
        placesLU.doLookup(data, placesLookupComplete);
    }
}

function placesLookupComplete(err, placesFound, notFoundData){
    if (err)
        handleError("error on places api lookup", err);
    else{
        logger("finished places api lookup. now saving data if there are unfound or differences");

        if (notFoundData && notFoundData.length > 0)
            save(settings.paths.placesNotFoundPath, notFoundData, function(err){
                if (err)
                    handleError("error writing unfound places", err);
                else
                    logger("finished writing not found data to file");
            });
        
        save(settings.paths.placesLookupResultsPath, placesFound, function(err){
            if (err)
                handleError("error saving places results", err);
            else{
                logger("finished writing places results to file");
                db.savePlacesFound(placesFound, function(err){
                    if (err)
                        handleError("error saving places results to firebase", err);
                    else{
                        logger("finished saving places to firebase");
                    }
                });
            }
        });
    }
}

function massageData(data){
    if (data && data.items){
        data.items.forEach(function(item, index) {
            item.heroId = index;
            item.searchStrings = [];

            if (item.image)
                item.image = decodeURI(item.image);
            if (item.phone){
                var decodedPhone = decodeURI(item.phone);
                item.phone = parseInt(decodedPhone.replace(/[^0-9]/g,''));
            }
            if (item.description)
                item.description = item.description; //.replace(/\r?\n|\r/g, '');
            if (item.moreInfoUrl){
                item.moreInfoUrl = decodeURI(item.moreInfoUrl);
                var title = item.moreInfoUrl.split('/portfolio/')[1].split('/')[0].replace(/-/g, ' ')
                item.title = title.replace(/(^|\s)[a-z]/g, function(f){ return f.toUpperCase(); });
            }
            if (item.phone){
                var phone = item.phone.toString();
                item.searchStrings.push(phone);
                item.searchStrings.push("(" + phone.substring(0, 3) + ") " + phone.substring(3, 6) + " " + phone.substring(6));
            }
            if (item.title)
                item.searchStrings.push(item.title);
        }, this);

        return data.items;
    }
}

function save(path, data, callback){
    writeToFile(path, data, function(err){
        if (err && callback)
            callback(err);
        else if (callback)
            callback();
    });
}

function handleError(errorMessage, err, data){
    returnCallback({ errorMessage: errorMessage, err: err, data: data });
}

function logger(logMessage, data){
    if (settings.debug)
        console.log(logMessage.toString(), data || '');
    if (settings.rollbar.sendToRollbar)
        if (data)
            rollbar.reportMessageWithPayloadData(logMessage.toString(), {
                level: "info",
                custom: data
            });
        else
            rollbar.reportMessage(logMessage.toString());
}

module.exports = dealRetriever;