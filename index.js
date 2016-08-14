var rollbar = require('rollbar');

var placesLU = require("./googlePlacesLookup.js");
var settings = require("./config/settings.js");
var writeToFile = require("./utils/writeToFile.js");
var webCrawler = require("./webCrawler.js");

var existingData = {};

if (settings.useExistingData){
    existingData.scrapeResults = require(settings.paths.scrapeResultsPath);
}

function init(){
    rollbar.init(settings.rollbar.accessToken);
    rollbar.handleUncaughtExceptionsAndRejections(settings.rollbar.accessToken, settings.rollbar.options);

    if (settings.useExistingData)
        placesLookup(existingData.scrapeResults);
    else
        webCrawler.crawlPage(crawlComplete);
}

function crawlComplete(err, response){
    if (err)
        handleError("error crawling site", err);
    else{
        var origData = response;
        var crawlData = massageData(response);
        logger("crawling my hero card website complete");
        save(settings.paths.scrapeResultsPath, crawlData, function(err){
            if (err)
                handleError("error saving scrape results", err);
            else{
                logger("finished writing scrape results to file: " + settings.paths.scrapeResultsPath);
                placesLookup(crawlData);
            }
        });
    }
}

function placesLookup(data){
    if (settings.doPlacesLU && data){
        logger("looking up crawled data in google places api");
        placesLU.doLookup(data, function(err, placesFound, notFoundData){
            if (err)
                handleError("error on places api lookup", err);
            else{
                logger("finished places api lookup. now saving data");
                if (notFoundData && notFoundData.length > 0)
                    save(settings.paths.placesNotFoundPath, notFoundData, function(err){
                        if (err)
                            handleError("error writing unfound places", err);
                        else
                            logger("finished writing not found data to file: " + settings.paths.placesNotFoundPath);
                    });

                save(settings.paths.placesLookupResultsPath, placesFound, function(err){
                    if (err)
                        handleError("error writing places file", err);
                    else
                        logger("finished writing places found to file: " + settings.paths.placesLookupResultsPath);
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
    if (settings.debug)
        console.log(errorMessage.toString(), err);
    if (settings.rollbar.sendToRollbar)
        if (data)
            rollbar.handleErrorWithPayloadData(err, data);
        else
            rollbar.handleError(err);
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

init();