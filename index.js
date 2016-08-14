var rollbar = require('rollbar');
var schedule = require('node-schedule');
var db = require("./app/firebaseWrapper.js");

var settings = require("./config/settings.js");
var dealRetriever = require("./app/dealRetriever.js");

function init(){
    rollbar.init(settings.rollbar.accessToken);
    rollbar.handleUncaughtExceptionsAndRejections(settings.rollbar.accessToken, settings.rollbar.options);

    var dataRetrievalJob = schedule.scheduleJob(settings.scheduler.cronJobString, getDeals);

    getDeals();
}

function getDeals(){
    dealRetriever.getDeals(function(err){
        if (err)
            handleError(err.errorMessage, err.err, err.data);
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