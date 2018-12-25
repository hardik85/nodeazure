var db = require('../connection');
var traffi_db = require('../connection_traffi');
var HttpStatusCode = require('http-status-codes');
var commonHelper = require('./CommonHelper');
var validateHelper = require('./ValidateHelper');
var vinHelper = require('./VINHelper');
var constants = require('../utils/constants');

exports.getRegPlateInfo = function (req, res) {
    req.setTimeout(0);

    //#region Paramters
    var IP = commonHelper.GetIPAddresss(req);
    var apiName = req.baseUrl + "/" + req.url.split("/")[1];
    // find second occurence of "/"
    var index = req.url.indexOf("/", req.url.indexOf("/") + 1);
    var parameters = req.url.substring(index + 1);
    var regPlate = req.query.regPlate;
    var languageCode = req.query.languagecode == undefined ? 'en' : req.query.languagecode;
    var apiKeyId = 0;
    var userId = 0;
    var apiLogId = 0;
    //#endregion

    if (regPlate != undefined) {
        validateHelper.ValidateAPIKey(req)
            .then(function (response) {
                if (response.Status == HttpStatusCode.OK) {
                    apiKeyId = response.ApiKeyId;
                    userId = response.UserId;

                    validateHelper.ValidateUserAccess(apiKeyId, apiName, null, userId, IP, parameters)
                        .then(function (response) {
                            if (response.Status == HttpStatusCode.OK) {
                                apiLogId = response.APILogId;
                                traffi_db.query("SELECT * FROM `trafidata1` WHERE `RegPlate`=?", [regPlate])
                                    .then(function (result) {
                                        if (result.length > 0) {
                                            vinHelper.IdentifyAndProcessVIN(result[0].VINNumber, languageCode, IP, apiKeyId)
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
                                            return res.status(HttpStatusCode.NOT_FOUND).json(constants.NoDataFound);
                                        }

                                    })
                                    .catch(function (error) {
                                        return reject(error);
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
        res.status(HttpStatusCode.NOT_FOUND).json(constants.RegPlateRequired);
    }
}