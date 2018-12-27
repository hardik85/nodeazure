var db = require('../connection');
var HttpStatusCode = require('http-status-codes');

var commonHelper = require('./CommonHelper');
var validateHelper = require('./ValidateHelper');
var oedataHelper = require('./OEDataHelper');

process.setMaxListeners(Infinity);

exports.OEPartsByCategory = function (req, res, next) {
    process.setMaxListeners(Infinity);

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
                var categoryCode = req.params.categorycode;

                var apiKeyId = 0;
                var userId = 0;
                var apiLogId = 0;
                var iso = "en", regiso = "US";

                iso = (req.params.iso != undefined && req.params.iso != 'en') ? req.params.iso : iso;
                regiso = (req.params.iso != undefined && req.params.iso != 'en') ? '' : regiso;
                var languageCode = iso;
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
                                        oedataHelper.IdentifyAndProcessVIN(vinNumber, languageCode, categoryCode, iso, regiso, IP, apiKeyId)
                                            .then(function (response) {
                                                db.query("UPDATE gtl_api_log SET Modified = ?,IPAddress=? WHERE Id = ?", [new Date().toISOString().slice(0, 19).replace('T', ' '), IP, apiLogId])
                                                    .then(function () {
                                                        if (response.Make == "BMW") {
                                                            res.status(response.Status).json({ data: response.Data });
                                                        }
                                                        else if (response.Make == "VOL") {
                                                            res.status(response.Status).json(response.Data);
                                                        }
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

function getIPAddresss(req) {
    var IP = 'No IP detected'
    var IPFromRequest = req.connection.remoteAddress;
    if (IPFromRequest != undefined) {
        var indexOfColon = IPFromRequest.lastIndexOf(':');
        IP = IPFromRequest.substring(indexOfColon + 1, IPFromRequest.length);
    }
    else if (req.headers['x-forwarded-for'] != undefined) {
        var indexOfColon = req.headers['x-forwarded-for'];
        IP = indexOfColon;
    }
    else {
        IP = '0.0.0.0';
    }

    return IP;
}

function incrementCount(apiKeyId) {
    var sqlQuery = "SELECT * FROM category_successlogcount WHERE APIKeyId = ?";

    db.query(sqlQuery, [apiKeyId], function (err, result) {
        if (err) {
            errorLog('BMWEPC - incrementCount', new Date().toISOString().slice(0, 19).replace('T', ' '), IP, err.message);
        }

        if (result.length == 0) {
            sqlQuery = "INSERT INTO category_successlogcount (CountValue, UpdatedTimeStamp, APIKeyId) VALUES ("
                + "1,"
                + "'" + new Date().toISOString().slice(0, 19).replace('T', ' ') + "'," + apiKeyId + ")";

            db.query(sqlQuery, function (err, result) {
                if (err) {
                    errorLog('BMWEPC - incrementCount', new Date().toISOString().slice(0, 19).replace('T', ' '), IP, err.message);
                }
            });
        }
        else {
            var countValue = parseInt(result[0].CountValue) + 1;
            sqlQuery = "UPDATE category_successlogcount SET CountValue = " + countValue + ",UpdatedTimeStamp="
                + "'" + new Date().toISOString().slice(0, 19).replace('T', ' ') + "' WHERE APIKeyId = " + apiKeyId;

            db.query(sqlQuery, function (err, result) {
                if (err) {
                    errorLog('BMWEPC - incrementCount', new Date().toISOString().slice(0, 19).replace('T', ' '), IP, err.message);
                }
            });
        }
    });
}

function saveLog(vinNumber, categoryCode, isoCode, status, IP, apiKeyId) {
    var sqlQuery = "INSERT INTO vin_category_parts_lookuplog (VINNumber, CategoryCode, ISOCode, IsSuccess, IPAddress, TimeStamp, APIKeyId) VALUES ("
        + "'" + vinNumber + "',"
        + "'" + categoryCode + "',"
        + "'" + isoCode + "',"
        + status + ",'"
        + IP + "',"
        + "'" + new Date().toISOString().slice(0, 19).replace('T', ' ') + "',"
        + apiKeyId + ")";

    db.query(sqlQuery, function (err, result) {
        if (err) {
            errorLog('BMWEPC - saveLog', new Date().toISOString().slice(0, 19).replace('T', ' '), IP, err.message);

        }
    });
}

function errorLog(method, timestamp, ip, message) {
    var fs = require('fs');
    var filepath = 'ErrorLog/VINCategoryPartsLog.txt';
    var str1 = 'Time: ' + timestamp;
    var str2 = 'IpAddress: ' + ip;
    var str3 = 'Method: ' + method;
    var str4 = 'Error Message: ' + message;
    var border = "=============================================================";

    if (fs.existsSync(filepath)) {
        fs.open(filepath, 'r+', function (err, fd) {
            fs.appendFile(filepath, border + os.EOL + str1 + os.EOL + str2 + os.EOL + str3 + os.EOL + str4 + os.EOL, function (err, fd) {
                if (err) throw err;
                // fs.close(fd);
            });
        });
    }
    else {
        fs.writeFile(filepath, "", (err) => {
            if (err) throw err;
            fs.open(filepath, 'r+', function (err, fd) {
                fs.appendFile(filepath, border + os.EOL + str1 + os.EOL + str2 + os.EOL + str3 + os.EOL + str4 + os.EOL, function (err, fd) {
                    if (err) throw err;
                    // fs.close(fd);
                });
            });
        });
    }
}