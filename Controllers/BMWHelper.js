var db = require('../connection');
var dbVIN = require('../connection_vindata_additional');
var bmwDb = require('../connection_BMW');

var HttpStatusCode = require('http-status-codes');
var commonHelper = require('./CommonHelper');

var constants = require('../utils/constants');

exports.ProcessVIN = function (vinNumber, languageCode, IP, apiKeyId) {
    return new Promise(function (resolve, reject) {
        dbVIN.query("SELECT * FROM vindata_general WHERE VIN=?", [vinNumber])
            .then(function (result) {
                if (result.length > 0) {
                    GetBMWVINModel(result)
                        .then(function (response) {
                            return GetBMWVINDetails(result, response, languageCode, reject, vinNumber, IP, apiKeyId, resolve);
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                else {
                    commonHelper.SaveLog(vinNumber, '0', IP, apiKeyId);

                    dbVIN.query("Select * from notfoundvin WHERE VINNumber =?", [vinNumber])
                        .then(function (result) {
                            if (result.length > 0) {
                                if (result[0].IsFound == 1) {
                                    dbVIN.query("SELECT * FROM vindata_general WHERE VIN=?", [vinNumber])
                                        .then(function (result) {
                                            GetBMWVINModel(result)
                                                .then(function (response) {
                                                    return GetBMWVINDetails(result, response, languageCode, reject, vinNumber, IP, apiKeyId, resolve);
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
                                                    if (result[0].IsFound == 1) {
                                                        dbVIN.query("SELECT * FROM vindata_general WHERE VIN=?", [vinNumber])
                                                            .then(function (result) {
                                                                GetBMWVINModel(result)
                                                                    .then(function (response) {
                                                                        return GetBMWVINDetails(result, response, languageCode, reject, vinNumber, IP, apiKeyId, resolve);
                                                                    })
                                                                    .catch(function (error) {
                                                                        return reject(error);
                                                                    });
                                                            })
                                                            .catch(function (error) {
                                                                return reject(error);
                                                            });
                                                    }
                                                    else if (result.length > 0 && result[0].IsFound == 2) {
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
            })
            .catch(function (error) {
                return reject(error);
            });
    });
}

exports.ProcessVINForOEData = function (vinNumber, categoryCode, iso, regiso, IP, apiKeyId) {
    return new Promise(function (resolve, reject) {
        let sql = `CALL Get_BMW_TecDoc_VinCategory_Parts(?,?,?,?)`;

        bmwDb.query(sql, [vinNumber, categoryCode, iso, regiso])
            .then(function (result) {
                if (result != undefined && result[0].length > 0) {
                    var data = [];
                    result[0].forEach(function (element) {
                        var item = {};
                        item["OEPartNumber"] = element.OEPartNumber;
                        item["PartText"] = element.PartText;

                        data.push(item);
                    }, this);

                    commonHelper.IncrementCount(apiKeyId);

                    return resolve({
                        Statsu: HttpStatusCode.OK,
                        Data: data
                    });
                }
                else {
                    commonHelper.SaveLog(vinNumber, categoryCode, IP, apiKeyId);
                    return resolve({
                        Statsu: HttpStatusCode.NOT_FOUND,
                        Data: constants.NoDataFound
                    });
                }
            })
            .catch(function (error) {
                return reject(error);
            });
    });
}

function GetBMWVINDetails(result, response, languageCode, reject, vinNumber, IP, apiKeyId, resolve) {
    var data = [];
    data.push(response.Data);
    var optionCode = [];

    //#region calculate std Option data
    if (result[0].Equipment != "") {
        var stdOptionList = result[0].Equipment.split(';');
        stdOptionList.forEach(element => {
            var stdOptionSubDataList = element.split('::');
            bmwDb.query("SELECT CASE WHEN '" + languageCode + "' = 'en' THEN description_en \
                                                WHEN '" + languageCode + "' = 'sv' THEN description_sv \
                                                WHEN '" + languageCode + "' = 'fi' THEN description_fi \
                                                WHEN '" + languageCode + "' = 'de' THEN description_de \
                                                WHEN '" + languageCode + "' = 'dk' THEN description_dk END AS Description FROM `bmwcarequipcode` \
                                                WHERE EquipCode = ?", [stdOptionSubDataList[0]])
                .then(function (result) {
                    var stdOptionSubDataResult = {
                        "EQCode": stdOptionSubDataList[0],
                        "Group": "Standard",
                        "Description": stdOptionSubDataList[1]
                    };
                    stdOptionSubDataResult["Description"] = result.length > 0 ? result[0].Description : stdOptionSubDataList[1];
                    if (stdOptionSubDataResult.EQCode != '') {
                        optionCode.push(stdOptionSubDataResult);
                    }
                })
                .catch(function (error) {
                    return reject(error);
                });
        });
    }
    //#endregion

    //#region calculate primaryOption data
    if (result[0].Options != "") {
        var primaryOptionList = result[0].Options.split(';');
        primaryOptionList.forEach(element => {
            var primaryOptionSubDataList = element.split('::');
            bmwDb.query("SELECT CASE WHEN '" + languageCode + "' = 'en' THEN description_en \
                                                WHEN '" + languageCode + "' = 'sv' THEN description_sv \
                                                WHEN '" + languageCode + "' = 'fi' THEN description_fi \
                                                WHEN '" + languageCode + "' = 'de' THEN description_de \
                                                WHEN '" + languageCode + "' = 'dk' THEN description_dk END AS Description FROM `bmwcarequipcode` \
                                                WHERE EquipCode = ?", [primaryOptionSubDataList[0]])
                .then(function (result) {
                    var primaryOptionSubDataResult = {
                        "EQCode": primaryOptionSubDataList[0],
                        "Group": "Primary",
                        "Description": primaryOptionSubDataList[1]
                    };
                    primaryOptionSubDataResult["Description"] = result.length > 0 ? result[0].Description : primaryOptionSubDataResult[1];
                    if (primaryOptionSubDataResult.EQCode != '') {
                        optionCode.push(primaryOptionSubDataResult);
                    }
                })
                .catch(function (error) {
                    return reject(error);
                });
        });
    }
    //#endregion

    if (result[0].Equipment != "" && result[0].Options != "" && optionCode.length > 0) {
        data.push(optionCode);
    }

    bmwDb.query('SELECT * FROM bmw_vindata_consolated WHERE VIN=?', [vinNumber])
        .then(function (result) {
            if (result && result[0]) {
                data[0].Engine = (data[0].Engine != "" && data[0].Engine != null) ? data[0].Engine : (result[0].EC_EC ? result[0].EC_EC : '-');
                data[0].Transmission = data[0].Transmission != "-" ? data[0].Transmission : result[0].Transmission ? result[0].Transmission : '-';
                data[0].Drive = (data[0].Drive != "" && data[0].Drive != null) ? data[0].Drive : result[0].EC_Drive ? result[0].EC_Drive : '-';
                data[0].BodyType = (data[0].BodyType != "" && data[0].BodyType != null) ? data[0].BodyType : result[0].Body ? result[0].Body : '-';
                data[0].Capacity = (data[0].Capacity != "" && data[0].Capacity != null) ? data[0].Capacity : result[0].EC_CC ? result[0].EC_CC : '-';
                data[0].FuelType = data[0].FuelType != "-" ? data[0].FuelType : result[0].EC_FuelType ? result[0].EC_FuelType : '-';
                data[0].FuelMixture = data[0].FuelMixture != "-" ? data[0].FuelMixture : result[0].FuelMixture ? result[0].FuelMixture : '-';
                data[0]['K-type'] = result[0].KTYPE ? result[0].KTYPE : '-';
                data[0]['KBANr'] = result[0].KBANR ? result[0].KBANR : '-';
                // converted to string so it substring function can be used to fetch exact date.
                var tempDateOfManufacture = '' + result[0].ManStartDate;
                if (tempDateOfManufacture) {
                    data[0].DoM = tempDateOfManufacture.substring(6, 8) + '-' + tempDateOfManufacture.substring(4, 6) + '-' + tempDateOfManufacture.substring(0, 4);
                }

                //#region Set Drivetype name
                if (data[0]["Drive"] == '2WD') {
                    data[0]["Drive"] = "Two Wheel Drive";
                }
                else if (data[0]["Drive"] == '4WD') {
                    data[0]["Drive"] = "All Wheel Drive";
                }
                //#endregion

                //#region Set Transmission name
                if (data[0]["Transmission"] == 'N' || data[0]["Transmission"] == 'M') {
                    data[0]["Transmission"] = "Manual Transmission";
                }
                else if (data[0]["Transmission"] == 'A') {
                    data[0]["Transmission"] = "Automatic Transmission";
                }
                //#endregion

                //#region Update the values based on K-type
                if (result[0].KTYPE) {
                    var sqlQuery = "SELECT FullDescription,Capacity_Technical,BodyType,DriveType,Power_KW,Power_PS, \
                                                        KBANumber,FuelType,FuelMixture FROM `gtl_passenger_cars` WHERE ktypeid=?";
                    dbVIN.query(sqlQuery, [result[0].KTYPE])
                        .then(function (result) {
                            if (result && result[0]) {
                                data[0].Model = result[0].FullDescription;
                                data[0].Capacity = result[0].Capacity_Technical;
                                data[0].BodyType = result[0].BodyType;
                                data[0].Drive = result[0].DriveType;
                                data[0].PowerkW = result[0].Power_KW;
                                data[0].PowerPS = result[0].Power_PS;
                                data[0].FuelType = result[0].FuelType ? result[0].FuelType : data[0].FuelType;
                                data[0].KBANr = result[0].KBANumber != null ? result[0].KBANumber.split(',')[0].replace(' ', '') : data[0].KBANr;
                                data[0].FuelMixture = result[0].FuelMixture ? result[0].FuelMixture : data[0].FuelMixture;
                            }
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                //#endregion               

                //#region  If data not found for K-type then check it from Traffidata
                if (data[0]['K-type'] == "-") {
                    commonHelper.GetDataFromTraffi(vinNumber)
                        .then(function (response) {
                            if (response.Status == HttpStatusCode.OK) {
                                data[0].Model = response.Data[0].Model;
                                data[0].Capacity = response.Data[0].Capacity;
                                data[0].BodyType = response.Data[0].BodyType;
                                data[0].Drive = response.Data[0].DriveType;
                                data[0].PowerkW = response.Data[0].PowerkW;
                                data[0].PowerPS = response.Data[0].PowerPS;
                                data[0].FuelType = response.Data[0].FuelType ? response.Data[0].FuelType : data[0].FuelType;
                                data[0].FuelMixture = response.Data[0].FuelMixture ? response.Data[0].FuelMixture : data[0].FuelMixture;
                                data[0]['K-type'] = response.Data[0]["K-type"] ? response.Data[0]["K-type"] : '-';
                                data[0].KBANr = response.Data[0].KBANr != null ? response.Data[0].KBANr.split(',')[0].replace(' ', '') : data[0].KBANr;
                            }
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                //#endregion

                if (data.length == 1) {
                    data.push(optionCode);
                }

                if (result.length > 0 && data[0]["PowerkW"].replace(' kW', '') != result[0]["EC_KW"]) {
                    bmwDb.query('UPDATE bmw_vindata_consolated SET EC_KW=?,EC_PS=? WHERE VIN=?', [data[0]["PowerkW"].replace(' kW', ''), data[0]["PowerPS"].replace(' PS', ''), vinNumber])
                        .then(function () {
                            commonHelper.SaveLog(vinNumber, '1', IP, apiKeyId);
                            commonHelper.IncrementCount(apiKeyId);
                            return resolve({
                                Status: HttpStatusCode.OK,
                                Data: data
                            });
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                else {
                    commonHelper.SaveLog(vinNumber, '1', IP, apiKeyId);
                    commonHelper.IncrementCount(apiKeyId);
                    return resolve({
                        Status: HttpStatusCode.OK,
                        Data: data
                    });
                }
            }
        })
        .catch(function (error) {
            return reject(error);
        });
}

function GetBMWVINModel(result) {
    return new Promise(function (resolve, reject) {
        try {
            var subData = {
                "VINNumber": result[0].VIN,
                "Make": result[0].Make,
                "Model": result[0].Model,
                "MarketCode": '-',
                "DoM": '-',
                "Engine": result[0].Engine != "" && result[0].EngineCode != "" ? result[0].EngineCode + " (" + result[0].Engine + ")" : "-",
                "Transmission": result[0].Transmission ? result[0].Transmission : "-",
                "Drive": result[0].DriveType ? result[0].DriveType : "-",
                "BodyType": result[0].BodyType ? result[0].BodyType : "-",
                "PowerkW": result[0].kW ? result[0].kW + " kW" : "-",
                "PowerPS": result[0].PS ? result[0].PS + " PS" : "-",
                "Capacity": result[0].EngineCapacity ? result[0].EngineCapacity + " ccm" : "-",
                "FuelType": result[0].FuelType ? result[0].FuelType : "-",
                "FuelMixture": result[0].FuelMixture ? result[0].FuelMixture : "-",
                "K-type": '-',
                "KBANr": result[0].KBANR ? result[0].KBANR : "-"
            };

            return resolve({ Status: HttpStatusCode.OK, Data: subData, Message: '' });
        }
        catch (error) {
            return reject(error);
        }
    });
}