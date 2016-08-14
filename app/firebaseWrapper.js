var firebase = require("firebase");
var settings = require("../config/settings.js");

firebase.initializeApp({
    databaseURL: settings.firebase.databaseUrl,
    serviceAccount: settings.paths.firebaseAccountCreds,
    databaseAuthVariableOverride: {
        uid: settings.firebase.uid
    }
});

var firebaseWrapper = {
    getScrapedResults: getScrapedResults,
    getNewScrapedResults: getNewScrapedResults,
    saveScrapedResults: saveScrapedResults,
    saveNewScrapedResults: saveNewScrapedResults,
    savePlacesFound: savePlacesFound
}

function getScrapedResults(callback){
    var db = firebase.database();
    var ref = db.ref("/scrapedResults");
    ref.once("value", function(snapshot) {
        callback(snapshot.val());
    });
}

function getNewScrapedResults(callback){
    var db = firebase.database();
    var ref = db.ref("/newScrapedResults");
    ref.once("value", function(snapshot) {
        callback(snapshot.val());
    });
}

function saveScrapedResults(data, callback){
    var db = firebase.database();
    var ref = db.ref("/scrapedResults");
    ref.set(data, function (err){
        callback(err);
    });
}

function saveNewScrapedResults(data, callback){
    var db = firebase.database();
    var ref = db.ref("/newScrapedResults");
    ref.set(data, function (err){
        callback(err);
    });
}

function savePlacesFound(data, callback){
    var db = firebase.database();
    var ref = db.ref("/placesFound");
    ref.set(data, function (err){
        callback(err);
    });
}

module.exports = firebaseWrapper;