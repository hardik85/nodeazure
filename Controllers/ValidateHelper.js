var db = require('../connection')
var constants = require('../utils/constants');
var HttpStatusCode = require('http-status-codes');

exports.ValidateVIN = function (req) {
    return new Promise(function (resolve, reject) {
        var vinNumber = (req.params.vinnumber == undefined) ? null : req.params.vinnumber;

        if (vinNumber == null || vinNumber == "") {
            return resolve({ Status: HttpStatusCode.BAD_REQUEST, Message: constants.VINRequired });
        }
        else if (vinNumber != null && vinNumber.length != 17) {
            return resolve({ Status: HttpStatusCode.BAD_REQUEST, Message: constants.InCorrectVIN });
        }
        else {
            return resolve({ Status: HttpStatusCode.OK, Message: constants.OK });
        }
    });
}

exports.ValidateAPIKey = function (req) {
    return new Promise(function (resolve, reject) {
        var apiKey = req.query.apikey ? req.query.apikey : req.headers.apikey;

        db.query("SELECT Id, AllowedAPICallInOneMinute, UserId FROM `gtl_api_key` WHERE `SecretKey` = ? and Active=1", [apiKey])
            .then(function (result) {
                if (result[0] == undefined) {
                    return resolve({ Status: HttpStatusCode.UNAUTHORIZED, Message: constants.InValidAPIKey });
                }
                return resolve({
                    Status: HttpStatusCode.OK,
                    ApiKeyId: result[0].Id,
                    AllowedAPICallInOneMinute: result[0].AllowedAPICallInOneMinute,
                    UserId: result[0].UserId
                });
            })
            .catch(function (error) {
                return reject(error);
            });
    });
}

exports.ValidateUserAccess = function (apiKeyId, apiName, vinNumber, userId, IP, parameters) {
    return new Promise(function (resolve, reject) {
        // Check user has valid license
        db.query("SELECT (SELECT GROUP_CONCAT(ip.IpAddress) FROM gtl_ipaddress ip \
                        INNER JOIN gtl_user_ipaddress uip ON uip.ipaddressid = ip.Id \
                        WHERE uip.UserId = ? AND ip.Active=1 AND uip.Active=1) UserIpAddresses \
                    FROM gtl_user U WHERE U.Id = ?", [userId, userId])
            .then(function (result) {
                // Check call from valid IP address                           
                if (result.length > 0) {
                    if (result[0].UserIpAddresses == null) {
                        db.query("INSERT INTO gtl_api_log (APIKeyId,APIName,VinNumber,Created, IPAddress, Parameters) VALUES (?,?,?,?,?,?)",
                            [apiKeyId, apiName, vinNumber, new Date().toISOString().slice(0, 19).replace('T', ' '), IP, parameters])
                            .then(function (result) {
                                return resolve({ Status: HttpStatusCode.OK, Message: '', APILogId: result.insertId });
                            })
                            .catch(function (error) {
                                return reject(error);
                            });
                    }
                    else if (result[0].UserIpAddresses != null && result[0].UserIpAddresses.match(new RegExp("(?:^|,)" + IP + "(?:,|$)"))) {
                        db.query("INSERT INTO gtl_api_log (APIKeyId,APIName,VinNumber,Created, IPAddress, Parameters) VALUES (?,?,?,?,?,?)",
                            [apiKeyId, apiName, vinNumber, new Date().toISOString().slice(0, 19).replace('T', ' '), IP, parameters])
                            .then(function (result) {
                                return resolve({ Status: HttpStatusCode.OK, Message: '', APILogId: result.insertId });
                            })
                            .catch(function (error) {
                                return reject(error);
                            });
                    }
                    else {
                        return resolve({ Status: HttpStatusCode.FORBIDDEN, Message: constants.AccessFromInValidIP });
                    }
                }
                else {
                    db.query("INSERT INTO gtl_api_log (APIKeyId,APIName,VinNumber,Created, IPAddress, Parameters) VALUES (?,?,?,?,?,?)",
                        [apiKeyId, apiName, vinNumber, new Date().toISOString().slice(0, 19).replace('T', ' '),
                            IP, parameters], function (err, result, fields) {
                                return resolve({ Status: HttpStatusCode.OK, Message: '', APILogId: result.insertId });
                            });
                }
            })
            .catch(function (error) {
                return reject(error);
            });

    });
}