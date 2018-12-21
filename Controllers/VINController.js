var db = require('../connection');
var HttpStatusCode = require('http-status-codes');
var commonHelper = require('./CommonHelper');
var validateHelper = require('./ValidateHelper');
var vinHelper = require('./VINHelper');

exports.getVINDetails = function (req, res, next) {
    req.setTimeout(0);
    validateHelper.ValidateVIN(req)
        .then(function (response) {
            if (response.Status == HttpStatusCode.OK) {

                //#region Paramters
                var IP = commonHelper.GetIPAddresss(req);
                var apiName = req.baseUrl + "/" + req.url.split("/")[1];
                // find second occurence of "/"
                var index = req.url.indexOf("/", req.url.indexOf("/") + 1);
                var parameters = req.url.substring(index + 1);
                var vinNumber = (req.params.vinnumber == undefined) ? null : req.params.vinnumber;
                var languageCode = req.params.languageCode == undefined ? 'en' : req.params.languageCode;
                var apiKeyId = 0;
                var userId = 0;
                var apiLogId = 0;
                //#endregion

                validateHelper.ValidateAPIKey(req)
                    .then(function (response) {
                        if (response.Status == HttpStatusCode.OK) {
                            apiKeyId = response.ApiKeyId;
                            userId = response.UserId;

                            validateHelper.ValidateUserAccess(apiKeyId, apiName, vinNumber, userId, IP, parameters)
                                .then(function (response) {
                                    if (response.Status == HttpStatusCode.OK) {
                                        apiLogId = response.APILogId;
                                        vinHelper.IdentifyAndProcessVIN(vinNumber, languageCode, IP, apiKeyId)
                                            .then(function (response) {
                                                db.query("UPDATE gtl_api_log SET Modified = ?,IPAddress=? WHERE Id = ?", [new Date().toISOString().slice(0, 19).replace('T', ' '), IP, apiLogId])
                                                    .then(function () {
                                                        res.status(response.Status).json({ data: response.Data });
                                                    })
                                                    .catch(function (error) {
                                                        return next(error);
                                                    });
                                            })
                                            .catch(function (error) {
                                                return next(error);
                                            });
                                    }
                                    else {
                                        res.status(response.Status).json(response.Message);
                                    }
                                })
                                .catch(function (error) {
                                    return next(error);
                                })
                        }
                        else {
                            res.status(response.Status).json(response.Message);
                        }
                    })
                    .catch(function (error) {
                        return next(error);
                    });
            }
            else {
                res.status(response.Status).json(response.Message);
            }
        })
        .catch(function (error) {
            return next(error);
        });
}

String.prototype.addAt = function (index, character) {
    try {
        return this.substr(0, index - 1) + character + this.substr(index - 1 + character.length - 1);
    } catch (ex) {
        return logger.LogError(next, ex, res);
    }
}