var db = require('../connection');
var dbVIN = require('../connection_vindata_additional');
var HttpStatusCode = require('http-status-codes');
var commonHelper = require('./CommonHelper');

exports.ProcessVIN = function (vinNumber, languageCode, IP, apiKeyId) {
    return new Promise(function (resolve, reject) {
        dbVIN.query("SELECT * FROM porschevisinfo WHERE VIN=?", [vinNumber])
            .then(function (result) {
                if (result.length > 0) {
                    GetPorscheVINModel(result)
                        .then(function (response) {
                            return GetPorscheVINDetails(response, result, languageCode, vinNumber, IP, apiKeyId, resolve, reject);
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                else {
                    commonHelper.SaveLog(vinNumber, '0', IP, apiKeyId);

                    dbVIN.query("Select * from notfoundvin WHERE VINNumber = ?", [vinNumber])
                        .then(function (result) {
                            if (result.length > 0) {
                                if (result[0].IsFound == 1) {
                                    dbVIN.query('CALL ProcessPorscheVin(?)', [vinNumber])
                                        .then(function () {
                                            dbVIN.query("SELECT * FROM porschevisinfo WHERE VIN=?", [vinNumber])
                                                .then(function (result) {
                                                    GetPorscheVINModel(result)
                                                        .then(function (response) {
                                                            return GetPorscheVINDetails(response, result, languageCode, vinNumber, IP, apiKeyId, resolve, reject);
                                                        })
                                                        .catch(function (error) {
                                                            return reject(error);
                                                        });
                                                })
                                                .catch(function (error) {
                                                    return reject(error);
                                                });
                                        })
                                        .catch(function (error) {
                                            return reject(error);
                                        });
                                }
                                else if (result[0].IsFound == 2 || result[0].IsFound == 0) {
                                    commonHelper.GetDataFromTraffi(vinNumber)
                                        .then(function (response) {
                                            return resolve({
                                                Status: response.Status,
                                                Data: response.Data
                                            });
                                        })
                                        .catch(function (error) {
                                            return reject(error);
                                        });
                                }
                            }
                            else {
                                var counttest = 1;
                                //insert in notfoundvin with VINNumber and IsFound=0
                                var sqlInsertQuery = "Insert into notfoundvin(VINNumber,IsFound,APIKeyId,Port) Values('" + vinNumber + "',0," + apiKeyId + "," + 5150 + ")";
                                dbVIN.query(sqlInsertQuery)
                                    .then(function () {
                                        var refreshId = setInterval(function () {

                                            //Select IsFound from notfoundvin for current VINNumber
                                            dbVIN.query("Select IsFound from notfoundvin where VINNumber = ?", [vinNumber])
                                                .then(function (result) {
                                                    counttest = counttest + 1;
                                                    if (result != undefined && result.length > 0 && result[0].IsFound == 1) {
                                                        dbVIN.query("SELECT * FROM porschevisinfo WHERE VIN=?", [vinNumber])
                                                            .then(function (result) {
                                                                if (result[0] == undefined) {
                                                                    dbVIN.query('CALL ProcessPorscheVin(?)', [vinNumber])
                                                                        .then(function () {
                                                                            dbVIN.query("SELECT * FROM porschevisinfo WHERE VIN=?", [vinNumber])
                                                                                .then(function (result) {
                                                                                    if (result.length == 0) {
                                                                                        commonHelper.GetDataFromTraffi(vinNumber)
                                                                                            .then(function (response) {
                                                                                                return resolve({
                                                                                                    Status: response.Status,
                                                                                                    Data: response.Data
                                                                                                });
                                                                                            })
                                                                                            .catch(function (error) {
                                                                                                return reject(error);
                                                                                            });
                                                                                    }
                                                                                    else {
                                                                                        GetPorscheVINModel(result)
                                                                                            .then(function (response) {
                                                                                                return GetPorscheVINDetails(response, result, languageCode, vinNumber, IP, apiKeyId, resolve, reject);
                                                                                            })
                                                                                            .catch(function (error) {
                                                                                                return reject(error);
                                                                                            });
                                                                                    }
                                                                                })
                                                                                .catch(function (error) {
                                                                                    return reject(error);
                                                                                });
                                                                        })
                                                                        .catch(function (error) {
                                                                            return reject(error);
                                                                        });
                                                                }
                                                                else {
                                                                    GetPorscheVINModel(result)
                                                                        .then(function (response) {
                                                                            return GetPorscheVINDetails(response, result, languageCode, vinNumber, IP, apiKeyId, resolve, reject);
                                                                        })
                                                                        .catch(function (error) {
                                                                            return reject(error);
                                                                        });
                                                                }
                                                            })
                                                            .catch(function (error) {
                                                                return reject(error);
                                                            });
                                                    }
                                                    else if (result != undefined && result.length > 0 && result[0].IsFound == 2) {
                                                        counttest = 1;
                                                        clearInterval(refreshId);
                                                        commonHelper.GetDataFromTraffi(vinNumber)
                                                            .then(function (response) {
                                                                return resolve({
                                                                    Status: response.Status,
                                                                    Data: response.Data
                                                                });
                                                            })
                                                            .catch(function (error) {
                                                                return reject(error);
                                                            });
                                                    }
                                                    else {
                                                        if (counttest == 7) {
                                                            counttest = 1;
                                                            clearInterval(refreshId);
                                                            commonHelper.GetDataFromTraffi(vinNumber)
                                                                .then(function (response) {
                                                                    return resolve({
                                                                        Status: response.Status,
                                                                        Data: response.Data
                                                                    });
                                                                })
                                                                .catch(function (error) {
                                                                    return reject(error);
                                                                });
                                                        }
                                                    }
                                                })
                                                .catch(function (error) {
                                                    return reject(error);
                                                });
                                        }, 7000);
                                    })
                                    .catch(function (error) {
                                        return reject(error);
                                    });
                            }
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
            });
    });

}

function GetPorscheVINDetails(response, result, languageCode, vinNumber, IP, apiKeyId, resolve, reject) {
    var data = [];
    var subData = response.Data;
    var allPRCodes = result[0].PRCODES.match(/.{1,3}/g);

    data.push(subData);

    if (data[0]["K-type"] == "-") {
        commonHelper.GetKtypeDataFromTraffi(vinNumber, data)
            .then(function (response) {
                ProcessEQCodes();
            })
            .catch(function (error) {
                return reject(error);
            });
    }
    else {
        ProcessEQCodes();
    }

    //#region Find EQCode and description
    function ProcessEQCodes() {
        var sqlQuery = "SELECT prnumber,`group`,description FROM porscheproptions\
                                WHERE FIND_IN_SET (PrNumber,(SELECT SPLIT_STR_LIST(PRCODES) \
                                FROM porschevisinfo WHERE VIN='" + vinNumber + "'))";
        dbVIN.query(sqlQuery)
            .then(function (result) {
                if (result.length > 0) {
                    var prCodes = [];
                    for (var i in allPRCodes) {
                        var item = {};
                        var eqCode = "-";
                        var group = "-";
                        var description = "-";
                        for (var index in result) {
                            if (allPRCodes[i] == result[index].prnumber) {
                                eqCode = result[index].prnumber;
                                group = result[index].group ? result[index].group : "-";
                                description = result[index].description;
                                // Update Engine and transmission description
                                if (result[index].group == "MOT") {
                                    data[0].Engine = data[0].Engine + " (" + result[index].prnumber + " : " + result[index].description + ")";
                                }
                                if (result[index].group == "GSP") {
                                    data[0].Transmission = data[0].Transmission + " (" + result[index].prnumber + " : " + result[index].description + ")";
                                }
                                break;
                            }
                            else {
                                eqCode = allPRCodes[i];
                                if ((result.length - 1) == index) {
                                    InsertEQcode(eqCode, vinNumber)
                                        .then(function (response) {
                                        })
                                        .catch(function (err) {
                                        });
                                }
                            }
                        }
                        item["EQCode"] = eqCode;
                        item["Group"] = group;
                        item["Description"] = description;
                        prCodes.push(item);
                    }
                    data.push(prCodes);
                    // log success entry
                    commonHelper.SaveLog(data[0].VINNumber, '1', IP, apiKeyId);
                    commonHelper.IncrementCount(apiKeyId);
                    return resolve({
                        Status: HttpStatusCode.OK,
                        Data: data
                    });
                }
                else {
                    var prCodes = [];
                    for (var i in allPRCodes) {
                        var item = {};
                        var eqCode = allPRCodes[i];
                        var group = "-";
                        var description = "-";
                        item["EQCode"] = eqCode;
                        item["Group"] = group;
                        item["Description"] = description;
                        prCodes.push(item);
                        InsertEQcode(eqCode, vinNumber)
                            .then(function (response) {
                            })
                            .catch(function (err) {
                            });
                    }
                    data.push(prCodes);
                    // log success entry
                    commonHelper.SaveLog(data[0].VINNumber, '1', IP, apiKeyId);
                    commonHelper.IncrementCount(apiKeyId);
                    return resolve({
                        Status: HttpStatusCode.OK,
                        Data: data
                    });
                }
            })
            .catch(function (error) {
                return reject(error);
            });
    }
    //#endregion  
}
function GetPorscheVINModel(result) {
    return new Promise(function (resolve, reject) {
        try {
            var tempDateOfManufacture = result[0].DOM;
            var dateOfManufacture = "-";
            if (tempDateOfManufacture) {
                dateOfManufacture = tempDateOfManufacture.addAt(3, '-');
                dateOfManufacture = dateOfManufacture.addAt(6, '-');
            }
            var subData = {
                "VINNumber": result[0].VIN,
                "Make": result[0].MAKE ? result[0].MAKE : '-',
                "Model": result[0].FullModel ? result[0].FullModel : result[0].MODEL,
                "MarketCode": result[0].SALETYPE ? result[0].SALETYPE.substring(0, 3) : '-',
                "DoM": dateOfManufacture,
                "Engine": result[0].ENGINECODE ? result[0].ENGINECODE : "-",
                "Transmission": result[0].TRANSCODE ? result[0].TRANSCODE : "-",
                "Drive": result[0].DriveType ? result[0].DriveType : "-",
                "BodyType": result[0].BodyType ? result[0].BodyType : "-",
                "PowerkW": result[0].kW ? result[0].kW + " kW" : "-",
                "PowerPS": result[0].PS ? result[0].PS + " PS" : "-",
                "Capacity": result[0].CCM ? result[0].CCM + " ccm" : "-",
                "FuelType": result[0].FuelType ? result[0].FuelType : "-",
                "FuelMixture": result[0].FuelMixture ? result[0].FuelMixture : "-",
                "K-type": result[0].KTYPE ? result[0].KTYPE : "-"
            };

            return resolve({ Status: HttpStatusCode.OK, Data: subData, Message: '' });
        }
        catch (error) {
            return reject(error);
        }
    });
}

function InsertEQcode(eqCode, vinNumber) {
    return new Promise(function (resolve, reject) {
        dbVIN.query("INSERT IGNORE INTO `porscheprptionwithoutdescription`(`prnumber`,`vin`) VALUES('" + eqCode + "','" + vinNumber + "')")
            .then(function () {
                return resolve({
                    Status: HttpStatusCode.OK,
                });
            })
            .catch(function (error) {
                return reject(error);
            });
    })
}