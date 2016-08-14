var request = require('request');
var async = require('async');
var settings = require("../config/settings.js");

var statuses = {
    OVER_QUERY_LIMIT: "OVER_QUERY_LIMIT",
    OK: "OK",
    ZERO_RESULTS: "ZERO_RESULTS"
};

var baseUrl = settings.googlePlacesApi.baseUrl +
                "?key=" + settings.googlePlacesApi.apiKey.myherocard +
                "&location=" + settings.googlePlacesApi.geoLocationOrigin.downtownAugusta +
                "&radius=" + settings.googlePlacesApi.radius +
                "&keyword=";

var GooglePlacesApiLookup = {
    doLookup: doPlacesLookup
}

function doPlacesLookup(lookupItems, returnCallback){
    var unfoundItems = [];

    async.map(lookupItems, sendPlacesApiRequest, function(err, results){
        if (err)
            returnCallback(err);
        else{
            var foundItems = results.filter(function(x){ if (x) return true; else return false; });
            returnCallback(null, foundItems, unfoundItems);
        }
    });

    function sendPlacesApiRequest(item, callback, searchStringIndex){
        if (!item.searchStrings || item.searchStrings.length < 1){
            unfoundItems.push(item);
            callback(null, null);
        }else{
            var targetIndex = searchStringIndex ? searchStringIndex : 0;
            var searchString = item.searchStrings[targetIndex];
            var requestUrl = baseUrl + searchString;
            request.get(requestUrl, function(err, response, body){
                if (err){
                    callback(err);
                } else {
                    var resultObj = JSON.parse(body);
                    if (resultObj.status == statuses.OVER_QUERY_LIMIT)
                        callback(resultObj.error_message);
                    else
                        if (resultObj.status == statuses.ZERO_RESULTS || !resultObj.results || resultObj.results.length == 0){
                            if (targetIndex < item.searchStrings.length - 1){
                                sendPlacesApiRequest(item, callback, targetIndex + 1)
                            }else{
                                unfoundItems.push(item);
                                callback(null, null);
                            }
                        }else{
                            var retVal = resultObj.results[0];
                            retVal.heroId = item.heroId;
                            callback(null, retVal);
                        }
                }
            });
        }
    }
}

module.exports = GooglePlacesApiLookup;