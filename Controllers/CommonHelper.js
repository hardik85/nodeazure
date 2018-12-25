var db = require('../connection');
var dbVIN = require('../connection_vindata_additional');
var traffiDB = require('../connection_traffi');
var os = require("os");
var HttpStatusCode = require('http-status-codes');
var constants = require('../utils/constants');

exports.GetIPAddresss = function (req) {
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

    return IP
}

exports.IncrementCount = function (apiKeyId) {
    return new Promise(function (resolve, reject) {
        var sqlQuery = "SELECT * FROM successlogcount WHERE APIKeyId = ?";

        db.query(sqlQuery, [apiKeyId])
            .then(function (result) {
                if (result.length == 0) {
                    sqlQuery = "INSERT INTO successlogcount (CountValue, UpdatedTimeStamp,APIKeyId) VALUES ("
                        + "1," + "'" + new Date().toISOString().slice(0, 19).replace('T', ' ') + "'," + apiKeyId + ")";

                    db.query(sqlQuery)
                        .then(function () {
                            return resolve({
                                Status: HttpStatusCode.OK,
                            });
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                else {
                    var countValue = parseInt(result[0].CountValue) + 1;
                    sqlQuery = "UPDATE successlogcount SET CountValue = " + countValue + ",UpdatedTimeStamp="
                        + "'" + new Date().toISOString().slice(0, 19).replace('T', ' ') + "' WHERE APIKeyId = " + apiKeyId;

                    db.query(sqlQuery)
                        .then(function () {
                            return resolve({
                                Status: HttpStatusCode.OK,
                            });
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
            })
            .catch(function (error) {
                return reject(error);
            });
    });
}

exports.SaveLog = function (vinNumber, status, IP, apiKeyId) {
    return new Promise(function (resolve, reject) {
        var sqlQuery = "INSERT INTO vinlookuplog (VINNumber, IsSuccess, IPAddress, TimeStamp, APIKeyId) VALUES ("
            + "'" + vinNumber + "',"
            + status + ",'"
            + IP + "',"
            + "'" + new Date().toISOString().slice(0, 19).replace('T', ' ') + "',"
            + apiKeyId + ")";

        db.query(sqlQuery)
            .then(function () {
                return resolve({
                    Status: HttpStatusCode.OK
                });
            })
            .catch(function (error) {
                return reject(error);
            });
    });
}

exports.ErrorLog = function (method, timestamp, ip, message) {
    return new Promise(function (resolve, reject) {
        var fs = require('fs');
        var filepath = 'ErrorLog/Log.txt';
        var str1 = 'Time: ' + timestamp;
        var str2 = 'IpAddress: ' + ip;
        var str3 = 'Method: ' + method;
        var str4 = 'Error Message: ' + message;
        var border = "=============================================================";

        if (fs.existsSync(filepath)) {
            fs.open(filepath, 'r+', function (err, fd) {
                fs.appendFile(filepath, border + os.EOL + str1 + os.EOL + str2 + os.EOL + str3 + os.EOL + str4 + os.EOL, function (err, fd) {
                    if (err) throw err;
                    return resolve({
                        Status: HttpStatusCode.OK
                    });
                });
            });
        }
        else {
            fs.writeFile(filepath, "", (err) => {
                if (err) throw err;
                fs.open(filepath, 'r+', function (err, fd) {
                    fs.appendFile(filepath, border + os.EOL + str1 + os.EOL + str2 + os.EOL + str3 + os.EOL + str4 + os.EOL, function (err, fd) {
                        if (err) throw err;
                        return resolve({
                            Status: HttpStatusCode.OK
                        });
                    });
                });
            });
        }
    });
}

exports.LogError = function (req, timestamp, apikey, method, error) {
    var ip = 'No IP detected'
    var IPFromRequest = req.connection.remoteAddress;
    if (IPFromRequest != undefined) {
        var indexOfColon = IPFromRequest.lastIndexOf(':');
        ip = IPFromRequest.substring(indexOfColon + 1, IPFromRequest.length);
    } else if (req.headers['x-forwarded-for'] != undefined) {
        var indexOfColon = req.headers['x-forwarded-for'];
        ip = indexOfColon;
    } else {
        ip = '0.0.0.0';
    }

    var sqlQuery = "INSERT INTO gtl_error_log (IPAddress, ApiKey, DateTime, ErrorMessage, ErrorNo, MethodName,Stack) \
        VALUES (?,?,?,?,?,?,?)";
    db.query(sqlQuery, [ip, apikey, timestamp, error.message, error.errno, method, error.stack])
        .then(function (err1) {
            if (err1) { }
        });
}

exports.GetDataFromTraffi = function (vinNumber) {
    return new Promise(function (resolve, reject) {
        traffiDB.query("SELECT * FROM trafidata1 WHERE VINNumber = ? ", [vinNumber])
            .then(function (result) {

                if (result.length > 0) {
                    var data = [];
                    var kwIndex = result[0].PowerKW ? result[0].PowerKW.indexOf('.') : '-';
                    var tempDateOfRegistration = result[0].DateofRegistration;
                    var dateOfRegistration = "-";
                    if (tempDateOfRegistration) {
                        dateOfRegistration = tempDateOfRegistration.addAt(5, '-');
                        dateOfRegistration = dateOfRegistration.addAt(8, '-');
                    }

                    // reverse the date as DoM is used in dd-mm-yyy
                    var regDate = dateOfRegistration.split("-");
                    var newRegDate = regDate[2] + "-" + regDate[1] + "-" + regDate[0];

                    traffiDB.query("SELECT ktypenr01 FROM `trafidata02` WHERE `VINNumber`=?", [vinNumber])
                        .then(function (ktypeResult) {
                            var modelDescription = "-";
                            var engineCode = "-";
                            var drive = "-";
                            var bodyType = "-";
                            var powerKW = "-";
                            var powerPS = "-";
                            var capacity = "-";
                            var fuelType = "-";
                            var fuelMixture = "-";
                            var ktype = "-";
                            var kbaNr = "-";

                            if (ktypeResult.length > 0) {
                                dbVIN.query("SELECT * FROM `gtl_passenger_cars` WHERE ktypeid=?", [ktypeResult[0].ktypenr01])
                                    .then(function (ktypePassengerCarResult) {
                                        if (ktypePassengerCarResult.length > 0) {
                                            modelDescription = ktypePassengerCarResult[0].FullDescription;
                                            engineCode = ktypePassengerCarResult[0].EngineCode != null ? ktypePassengerCarResult[0].EngineCode.split(',')[0] : "-";
                                            drive = ktypePassengerCarResult[0].DriveType;
                                            bodyType = ktypePassengerCarResult[0].BodyType;
                                            powerKW = ktypePassengerCarResult[0].Power_KW;
                                            powerPS = ktypePassengerCarResult[0].Power_PS;
                                            capacity = ktypePassengerCarResult[0].Capacity_Technical;
                                            fuelType = ktypePassengerCarResult[0].FuelType;
                                            fuelMixture = ktypePassengerCarResult[0].FuelMixture;
                                            ktype = ktypePassengerCarResult[0].ktypeid;
                                            kbaNr = ktypePassengerCarResult[0].KBANumber != null ? ktypePassengerCarResult[0].KBANumber.split(',')[0].replace(' ', '') : "-";
                                        }

                                        var subData = {
                                            "VINNumber": result[0].VINNumber,
                                            "Make": result[0].Make ? result[0].Make : '-',
                                            "Model": result[0].ModelDescription ? result[0].ModelDescription : modelDescription,
                                            "MarketCode": '-',
                                            "DoM": '-',
                                            "DoR": newRegDate,
                                            "Engine": engineCode,
                                            "Transmission": "-",
                                            "Drive": drive,
                                            "BodyType": bodyType,
                                            "PowerkW": powerKW != "-" ? powerKW : (result[0].PowerKW != '' ? result[0].PowerKW.substring(0, kwIndex != -1 ? kwIndex : result[0].PowerKW.length) + " kW" : result[0].PowerkW),
                                            "PowerPS": powerPS != "-" ? powerPS : (result[0].PowerKW != '' ? Math.round(result[0].PowerKW.substring(0, kwIndex != -1 ? kwIndex : result[0].PowerKW.length) * 1.363636) + " PS" : "-"),
                                            "Capacity": capacity != "-" ? capacity : (result[0].EngineCapacity ? result[0].EngineCapacity + " ccm" : "-"),
                                            "FuelType": fuelType,
                                            "FuelMixture": fuelMixture,
                                            "K-type": ktype,
                                            "KBANr": kbaNr
                                        };

                                        data.push(subData);

                                        return resolve({
                                            Data: data,
                                            Status: HttpStatusCode.OK
                                        });
                                    })
                                    .catch(function (error) {
                                        return reject(error);
                                    });
                            }
                            else {
                                var subData = {
                                    "VINNumber": result[0].VINNumber,
                                    "Make": result[0].Make ? result[0].Make : '-',
                                    "Model": result[0].ModelDescription ? result[0].ModelDescription : modelDescription,
                                    "MarketCode": '-',
                                    "DoM": '-',
                                    "DoR": newRegDate,
                                    "Engine": "-",
                                    "Transmission": "-",
                                    "Drive": drive,
                                    "BodyType": bodyType,
                                    "PowerkW": powerKW != "-" ? powerKW : (result[0].PowerKW != '' ? result[0].PowerKW.substring(0, kwIndex != -1 ? kwIndex : result[0].PowerKW.length) + " kW" : result[0].PowerkW),
                                    "PowerPS": powerPS != "-" ? powerPS : (result[0].PowerKW != '' ? Math.round(result[0].PowerKW.substring(0, kwIndex != -1 ? kwIndex : result[0].PowerKW.length) * 1.363636) + " PS" : "-"),
                                    "Capacity": capacity != "-" ? capacity : (result[0].EngineCapacity ? result[0].EngineCapacity + " ccm" : "-"),
                                    "FuelType": fuelType,
                                    "FuelMixture": fuelMixture,
                                    "K-type": ktype,
                                    "KBANr": kbaNr
                                };

                                data.push(subData);

                                return resolve({
                                    Data: data,
                                    Status: HttpStatusCode.OK
                                });
                            }
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                else {
                    return resolve({
                        Status: HttpStatusCode.NOT_FOUND,
                        Data: constants.NoDataFound
                    });
                }
            })
            .catch(function (error) {
                return reject(error);
            });
    });
}

exports.GetKtypeDataFromTraffi = function (vinNumber, data) {
    return new Promise(function (resolve, reject) {
        traffiDB.query("SELECT ktypenr01 FROM `trafidata02` WHERE `VINNumber`=?", [vinNumber])
            .then(function (ktypeResult) {
                if (ktypeResult.length > 0) {
                    dbVIN.query("SELECT * FROM `gtl_passenger_cars` WHERE ktypeid=?", [ktypeResult[0].ktypenr01])
                        .then(function (ktypePassengerCarResult) {

                            if (ktypePassengerCarResult.length > 0) {
                                data[0].Model = ktypePassengerCarResult[0].FullDescription;
                                data[0].Drive = ktypePassengerCarResult[0].DriveType;
                                data[0].BodyType = ktypePassengerCarResult[0].BodyType;
                                data[0].PowerkW = ktypePassengerCarResult[0].Power_KW;
                                data[0].PowerPS = ktypePassengerCarResult[0].Power_PS;
                                data[0].Capacity = ktypePassengerCarResult[0].Capacity_Technical;
                                data[0].FuelType = ktypePassengerCarResult[0].FuelType;
                                data[0].FuelMixture = ktypePassengerCarResult[0].FuelMixture;
                                data[0]["K-type"] = ktypePassengerCarResult[0].ktypeid;
                                data[0].KBANr = ktypePassengerCarResult[0].KBANumber != null ? ktypePassengerCarResult[0].KBANumber.split(',')[0].replace(' ', '') : "-";
                                return resolve({
                                    Status: HttpStatusCode.OK,
                                    Data: data
                                });
                            }
                            else {
                                return resolve({
                                    Status: HttpStatusCode.NOT_FOUND,
                                    Data: []
                                })
                            }
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                else {
                    return resolve({
                        Status: HttpStatusCode.NOT_FOUND,
                        Data: []
                    });
                }
            })
            .catch(function (error) {
                return reject(error);
            });
    });
}
