var dbVIN = require('../connection_vindata_additional');
var volvobasedata = require('../connection_volvo_basedata');
var volvoEPC = require('../connection_volvo_epc');
var volvoParts = require('../connection_volvo_parts');
var basedatadb = require('../connection_volvo_basedata');
var traffiDB = require('../connection_traffi');
var commonHelper = require('./CommonHelper');
var vinHelper = require('./VINHelper');
var constants = require('../utils/constants');

var HttpStatusCode = require('http-status-codes');

exports.ProcessVIN = function (vinNumber, languageCode, IP, apiKeyId, make) {
    return new Promise(function (resolve, reject) {
        dbVIN.query("SELECT * FROM vindata_general WHERE VIN=?", [vinNumber])
            .then(function (result) {
                if (result.length > 0) {
                    GetGeneralVINModel(result)
                        .then(function (response) {
                            return GetGeneralVINDetails(response, result, vinNumber, IP, apiKeyId, resolve, reject);
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                else {
                    commonHelper.SaveLog(vinNumber, '0', IP, apiKeyId);

                    dbVIN.query("Select IsFound from notfoundvin where VINNumber = ?", [vinNumber])
                        .then(function (result) {
                            if (result != undefined && result.length > 0) {
                                if (result[0].IsFound == 1) {
                                    dbVIN.query("SELECT * FROM vindata_general WHERE VIN=?", [vinNumber])
                                        .then(function (result) {
                                            GetGeneralVINModel(result)
                                                .then(function (response) {
                                                    return GetGeneralVINDetails(response, result, vinNumber, IP, apiKeyId, resolve, reject);
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
                                            if (response.Status != HttpStatusCode.OK) {
                                                if (make == 'VOL') {
                                                    GetVolvoDetailsFromBaseDataDB(vinNumber)
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
                                                    return resolve({
                                                        Status: response.Status,
                                                        Data: response.Data
                                                    });
                                                }
                                            }
                                            else {
                                                return resolve({
                                                    Status: response.Status,
                                                    Data: response.Data
                                                });
                                            }
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
                                                        dbVIN.query("SELECT * FROM vindata_general WHERE VIN=?", [vinNumber])
                                                            .then(function (result) {
                                                                GetGeneralVINModel(result)
                                                                    .then(function (response) {
                                                                        return GetGeneralVINDetails(response, result, vinNumber, IP, apiKeyId, resolve, reject);
                                                                    })
                                                                    .catch(function (error) {
                                                                        return reject(error);
                                                                    });
                                                            });
                                                    }
                                                    else if (result != undefined && result[0].IsFound == 2) {
                                                        counttest = 1;
                                                        clearInterval(refreshId);
                                                        commonHelper.GetDataFromTraffi(vinNumber)
                                                            .then(function (response) {
                                                                if (response.Status != HttpStatusCode.OK) {
                                                                    if (make == 'VOL') {
                                                                        GetVolvoDetailsFromBaseDataDB(vinNumber)
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
                                                                        return resolve({
                                                                            Status: response.Status,
                                                                            Data: response.Data
                                                                        });
                                                                    }
                                                                }
                                                                else {
                                                                    return resolve({
                                                                        Status: response.Status,
                                                                        Data: response.Data
                                                                    });
                                                                }
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
                                                                    if (response.Status != HttpStatusCode.OK) {
                                                                        if (make == 'VOL') {
                                                                            GetVolvoDetailsFromBaseDataDB(vinNumber)
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
                                                                            return resolve({
                                                                                Status: response.Status,
                                                                                Data: response.Data
                                                                            });
                                                                        }
                                                                    }
                                                                    else {
                                                                        return resolve({
                                                                            Status: response.Status,
                                                                            Data: response.Data
                                                                        });
                                                                    }
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

exports.ProcessVINForOEData = function (vinNumber, languageCode, originalCategoryCode, IP, apiKeyId) {
    return new Promise(function (resolve, reject) {
        vinHelper.IdentifyAndProcessVIN(vinNumber, languageCode, IP, apiKeyId)
            .then(function (response) {
                var partsList = [];
                var oeNumberListForParts = [];
                var categoryCode = 0;

                // Data found from parser
                if (response.Status == HttpStatusCode.OK && response.Data.length > 0) {
                    if (originalCategoryCode == '69' || originalCategoryCode == '70') {
                        categoryCode = 2
                    } else if (originalCategoryCode == '74' || originalCategoryCode == '82') {
                        categoryCode = 3
                    }
                    else if (originalCategoryCode == '5' || originalCategoryCode == '96') {
                        categoryCode = 4
                    }
                    else if (originalCategoryCode == '7') {
                        categoryCode = 5
                    }
                    else if (originalCategoryCode == '152' || originalCategoryCode == '23' || originalCategoryCode == '161') {
                        categoryCode = 6
                    }
                    else if (originalCategoryCode == '28' || originalCategoryCode == '126') {
                        categoryCode = 7
                    }
                    else if (originalCategoryCode == '81' || originalCategoryCode == '85') {
                        categoryCode = 8
                    }

                    var model = '%' + response.OriginalModel + '%';
                    var year = response.Data[0].DoM;
                    var engine = response.Data[0].Engine;

                    var volvoTableName = "volvo_datatbl_xc90_2003_19";
                    if (model.toString().indexOf('XC70') > -1) {
                        volvoTableName = 'volvo_datatbl_xc70_2008_16';
                    }
                    else if (model.toString().indexOf('XC90') > -1) {
                        volvoTableName = 'volvo_datatbl_xc90_2003_19';
                    }
                    else if (model.toString().indexOf('XC60') > -1) {
                        volvoTableName = 'volvo_datatbl_xc60_2009_19';
                    }
                    else if (model.toString().indexOf('XC40') > -1) {
                        volvoTableName = 'volvo_datatbl_xc40_2018_19';
                    }
                    else if (model.toString().indexOf('V90') > -1) {
                        volvoTableName = 'volvo_datatbl_v90cc_2017_19';
                    }

                    // Fetch from volvo database (Parser)
                    // Transmission check is not required as it is not getting same as parts parser database
                    volvoParts.query("SELECT DISTINCT `PartNo`, `PartDesc` FROM " + volvoTableName + " WHERE Model like ? AND YEAR=? AND ENGINE = ?  AND `MainGroupNo`=? AND (`PartRegion`='EU' OR `PartRegion`='NS') ",
                        [model, year, engine, categoryCode])
                        .then(function (result) {
                            if (result != undefined && result.length == 0) {
                                // If data not found then go for basedata database
                                if (originalCategoryCode == '7') {
                                    categoryCode = 2
                                } else if (originalCategoryCode == '5' || originalCategoryCode == '96') {
                                    categoryCode = 1
                                } else if (originalCategoryCode == '28' || originalCategoryCode == '126') {
                                    categoryCode = 3
                                } else if (originalCategoryCode == '81' || originalCategoryCode == '85') {
                                    categoryCode = 4
                                } else if (originalCategoryCode == '152' || originalCategoryCode == '23' || originalCategoryCode == '161') {
                                    categoryCode = 5
                                } else if (originalCategoryCode == '') {
                                    categoryCode = 6
                                } else if (originalCategoryCode == '151') {
                                    categoryCode = 7
                                } else if (originalCategoryCode == '69' || originalCategoryCode == '70') {
                                    categoryCode = 8
                                } else if (originalCategoryCode == '74' || originalCategoryCode == '82') {
                                    categoryCode = 9
                                } else if (originalCategoryCode == '78' || originalCategoryCode == '102') {
                                    categoryCode = 10
                                }

                                sqlQuery = 'CALL getVINComponentsByPartnerGroupId(?,?)';
                                volvobasedata.query(sqlQuery, [vinNumber, 1002])
                                    .then(function (vinResult) {
                                        if (vinResult != undefined && vinResult[0].length > 1) {
                                            var carmodel = vinResult[0][0].Cid;

                                            volvoEPC.query("select distinct fkCatalogueComponent,fkCatalogueComponent_Parent,AlternateComponentPath from VirtualToShared where fkCatalogueComponent in (\
                                                            select cc.Id from CatalogueComponents cc inner join ComponentConditions co\
                                                            on co.fkCatalogueComponent = cc.Id and ModelCid=" + carmodel + " \
                                                            ) and AlternateComponentPath like '" + categoryCode + ",%'")
                                                .then(function (result) {
                                                    if (result != undefined && result.length > 0) {
                                                        var carList = [];
                                                        var carDataResult = result;
                                                        for (var i in result) {
                                                            if (carList.indexOf(result[i].fkCatalogueComponent_Parent) == -1) {
                                                                carList.push(result[i].fkCatalogueComponent_Parent);
                                                            }
                                                        }

                                                        volvoEPC.query("select distinct cc.ComponentPath from CatalogueComponents cc where cc.id in (?) ORDER BY cc.id", [carList])
                                                            .then(function (result) {
                                                                var mainpartsList = result;
                                                                if (!mainpartsList) {
                                                                    return resolve({
                                                                        Status: HttpStatusCode.NOT_FOUND,
                                                                        Data: constants.NoDataFound
                                                                    });
                                                                }
                                                                if (mainpartsList && mainpartsList.length == 0) {
                                                                    return resolve({
                                                                        Status: HttpStatusCode.NOT_FOUND,
                                                                        Data: constants.NoDataFound
                                                                    });
                                                                } else {
                                                                    var mainassemblyList = [];
                                                                    for (var part in mainpartsList) {
                                                                        var mainpart = mainpartsList[part];
                                                                        var newList = [];
                                                                        for (var i in carDataResult) {
                                                                            if (carDataResult[i].AlternateComponentPath.indexOf(mainpart.ComponentPath) > -1) {
                                                                                if (newList.indexOf(carDataResult[i].fkCatalogueComponent) == -1) {
                                                                                    newList.push(carDataResult[i].fkCatalogueComponent);
                                                                                    mainassemblyList.push({
                                                                                        'Id': carDataResult[i].fkCatalogueComponent
                                                                                    })
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                    if (mainassemblyList.length) {
                                                                        var assemblyIndex = 0;
                                                                        for (var assembly in mainassemblyList) {
                                                                            (function () {
                                                                                var mainassembly = mainassemblyList[assembly];
                                                                                volvoEPC.query("select Lexicon.Description,PartItems.ItemNumber from CatalogueComponents cc \
                                                                                                inner join PartItems on PartItems.Id = CC.fkPartItem\
                                                                                                inner join Lexicon on PartItems.DescriptionId = Lexicon.DescriptionId\
                                                                                                where cc.TypeId=4 and Lexicon.fkLanguage=15 and cc.ParentComponentId = " + mainassembly.Id + "")
                                                                                    .then(function (result) {
                                                                                        for (var model in result) {
                                                                                            if (oeNumberListForParts.indexOf(result[model].ItemNumber) == -1) {
                                                                                                var item = {};
                                                                                                oeNumberListForParts.push(result[model].ItemNumber);
                                                                                                item["OEPartNumber"] = result[model].ItemNumber;
                                                                                                item["PartText"] = result[model].Description;
                                                                                                partsList.push(item);
                                                                                            }
                                                                                        }
                                                                                        assemblyIndex = assemblyIndex + 1;
                                                                                        if (assemblyIndex == mainassemblyList.length) {
                                                                                            return resolve({
                                                                                                Status: HttpStatusCode.OK,
                                                                                                Data: partsList
                                                                                            });
                                                                                        }
                                                                                    })
                                                                                    .catch(function (error) {
                                                                                        return reject(error);
                                                                                    });
                                                                            })()
                                                                        }
                                                                    } else {
                                                                        return resolve({
                                                                            Status: HttpStatusCode.NOT_FOUND,
                                                                            Data: constants.NoDataFound
                                                                        });
                                                                    }
                                                                }
                                                            })
                                                            .catch(function (error) {
                                                                return reject(error);
                                                            });
                                                    } else {
                                                        return resolve({
                                                            Status: HttpStatusCode.NOT_FOUND,
                                                            Data: constants.NoDataFound
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
                            }
                            else {
                                for (var model in result) {
                                    var item = {};
                                    item["OEPartNumber"] = result[model].PartNo;
                                    item["PartText"] = result[model].PartDesc.replace('\n', ' ');
                                    partsList.push(item);
                                }
                                return resolve({
                                    Status: HttpStatusCode.OK,
                                    Data: partsList
                                });
                            }
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                else {
                    // Search VIN number in basedata database of volvo
                    if (originalCategoryCode == '7') {
                        categoryCode = 2
                    } else if (originalCategoryCode == '5' || originalCategoryCode == '96') {
                        categoryCode = 1
                    } else if (originalCategoryCode == '28' || originalCategoryCode == '126') {
                        categoryCode = 3
                    } else if (originalCategoryCode == '81' || originalCategoryCode == '85') {
                        categoryCode = 4
                    } else if (originalCategoryCode == '152' || originalCategoryCode == '23' || originalCategoryCode == '161') {
                        categoryCode = 5
                    } else if (originalCategoryCode == '') {
                        categoryCode = 6
                    } else if (originalCategoryCode == '151') {
                        categoryCode = 7
                    } else if (originalCategoryCode == '69' || originalCategoryCode == '70') {
                        categoryCode = 8
                    } else if (originalCategoryCode == '74' || originalCategoryCode == '82') {
                        categoryCode = 9
                    } else if (originalCategoryCode == '78' || originalCategoryCode == '102') {
                        categoryCode = 10
                    }

                    sqlQuery = 'CALL getVINComponentsByPartnerGroupId(?,?)';
                    volvobasedata.query(sqlQuery, [vinNumber, 1002])
                        .then(function (vinResult) {
                            if (vinResult != undefined && vinResult[0].length > 1) {
                                var carmodel = vinResult[0][0].Cid;
                                var model = '%' + vinResult[0][0].ModelDesc + '%';
                                var year = vinResult[0][0].YearDesc;
                                var engine = vinResult[0][0].EDesc == "" ? vinResult[0][1].EDesc : vinResult[0][0].EDesc;
                                var transmission = vinResult[0][0].TDesc == "" ? vinResult[0][1].TDesc : vinResult[0][0].TDesc;

                                var volvoTableName = "volvo_datatbl_xc90_2003_19";
                                if (model.toString().indexOf('XC70') > -1) {
                                    volvoTableName = 'volvo_datatbl_xc70_2008_16';
                                }
                                else if (model.toString().indexOf('XC90') > -1) {
                                    volvoTableName = 'volvo_datatbl_xc90_2003_19';
                                }
                                else if (model.toString().indexOf('XC60') > -1) {
                                    volvoTableName = 'volvo_datatbl_xc60_2009_19';
                                }
                                else if (model.toString().indexOf('XC40') > -1) {
                                    volvoTableName = 'volvo_datatbl_xc40_2018_19';
                                }
                                else if (model.toString().indexOf('V90') > -1) {
                                    volvoTableName = 'volvo_datatbl_v90cc_2017_19';
                                }

                                volvoParts.query("SELECT DISTINCT `PartNo`, `PartDesc` FROM " + volvoTableName + " WHERE Model like ? AND YEAR=? AND ENGINE = ? AND `Transmission`=? AND `MainGroupNo`=?",
                                    [model, year, engine, transmission, originalCategoryCode])
                                    .then(function (result) {
                                        if (result != undefined && result.length > 0) {
                                            for (var model in result) {
                                                var item = {};
                                                item["OEPartNumber"] = result[model].PartNo;
                                                item["PartText"] = result[model].PartDesc.replace('\n', ' ');
                                                partsList.push(item);
                                            }
                                            return resolve({
                                                Status: HttpStatusCode.OK,
                                                Data: partsList
                                            });
                                        }
                                        else {
                                            volvoEPC.query("select distinct fkCatalogueComponent,fkCatalogueComponent_Parent,AlternateComponentPath from VirtualToShared where fkCatalogueComponent in (\
                                                            select cc.Id from CatalogueComponents cc inner join ComponentConditions co\
                                                            on co.fkCatalogueComponent = cc.Id and ModelCid=" + carmodel + " \
                                                            ) and AlternateComponentPath like '" + categoryCode + ",%'")
                                                .then(function (result) {
                                                    if (result) {
                                                        var carList = [];
                                                        var carDataResult = result;
                                                        for (var i in result) {
                                                            if (carList.indexOf(result[i].fkCatalogueComponent_Parent) == -1) {
                                                                carList.push(result[i].fkCatalogueComponent_Parent);
                                                            }
                                                        }
                                                        volvoEPC.query("select distinct cc.ComponentPath from CatalogueComponents cc where cc.id in (?) ORDER BY cc.id", [carList])
                                                            .then(function (result) {
                                                                var mainpartsList = result;
                                                                if (!mainpartsList) {
                                                                    return resolve({
                                                                        Status: HttpStatusCode.NOT_FOUND,
                                                                        Data: constants.NoDataFound
                                                                    });
                                                                }
                                                                if (mainpartsList && mainpartsList.length == 0) {
                                                                    return resolve({
                                                                        Status: HttpStatusCode.NOT_FOUND,
                                                                        Data: constants.NoDataFound
                                                                    });
                                                                } else {
                                                                    var mainassemblyList = [];
                                                                    for (var part in mainpartsList) {
                                                                        var mainpart = mainpartsList[part];
                                                                        var newList = [];
                                                                        for (var i in carDataResult) {
                                                                            if (carDataResult[i].AlternateComponentPath.indexOf(mainpart.ComponentPath) > -1) {
                                                                                if (newList.indexOf(carDataResult[i].fkCatalogueComponent) == -1) {
                                                                                    newList.push(carDataResult[i].fkCatalogueComponent);
                                                                                    mainassemblyList.push({
                                                                                        'Id': carDataResult[i].fkCatalogueComponent
                                                                                    })
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                    if (mainassemblyList.length) {
                                                                        var assemblyIndex = 0;
                                                                        for (var assembly in mainassemblyList) {
                                                                            (function () {
                                                                                var mainassembly = mainassemblyList[assembly];
                                                                                volvoEPC.query("select Lexicon.Description,PartItems.ItemNumber from CatalogueComponents cc \
                                                                                                inner join PartItems on PartItems.Id = CC.fkPartItem\
                                                                                                inner join Lexicon on PartItems.DescriptionId = Lexicon.DescriptionId and Lexicon.fkLanguage=15\
                                                                                                where cc.TypeId=4 and cc.ParentComponentId = " + mainassembly.Id + "")
                                                                                    .then(function (result) {
                                                                                        for (var model in result) {
                                                                                            if (oeNumberListForParts.indexOf(result[model].ItemNumber) == -1) {
                                                                                                var item = {};
                                                                                                oeNumberListForParts.push(result[model].ItemNumber);
                                                                                                item["OEPartNumber"] = result[model].ItemNumber;
                                                                                                item["PartText"] = result[model].Description;
                                                                                                partsList.push(item);
                                                                                            }
                                                                                        }
                                                                                        assemblyIndex = assemblyIndex + 1;
                                                                                        if (assemblyIndex == mainassemblyList.length) {
                                                                                            return resolve({
                                                                                                Status: HttpStatusCode.OK,
                                                                                                Data: partsList
                                                                                            });
                                                                                        }
                                                                                    })
                                                                                    .catch(function (error) {
                                                                                        return reject(error);
                                                                                    });
                                                                            })()
                                                                        }
                                                                    } else {
                                                                        return resolve({
                                                                            Status: HttpStatusCode.NOT_FOUND,
                                                                            Data: constants.NoDataFound
                                                                        });
                                                                    }
                                                                }
                                                            })
                                                            .catch(function (error) {
                                                                return reject(error);
                                                            });
                                                    } else {
                                                        return resolve({
                                                            Status: HttpStatusCode.NOT_FOUND,
                                                            Data: constants.NoDataFound
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
                            } else {
                                return resolve({
                                    Status: HttpStatusCode.NOT_FOUND,
                                    Data: constants.NoDataFound
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

function GetVolvoDetailsFromBaseDataDB(vinNumber) {
    return new Promise(function (resolve, reject) {
        basedatadb.query("CALL getVINComponentsByPartnerGroupId('" + vinNumber + "',1002)")
            .then(function (result) {
                if (result && result.length > 0) {
                    var index = 0;
                    var i = 0;
                    var year = "-";
                    while (index == 0) {
                        year = result[0][i].YearDesc;
                        if (result[0][i].EDesc != '') {
                            index++;
                            var model = '';
                            if (result[0][i].ModelDesc && result[0][i].ModelDesc.indexOf(" ") != -1) {
                                model = result[0][i].ModelDesc.substring(0, 3);
                            }
                            else {
                                model = result[0][i].ModelDesc;
                            }
                            var enginecode = '';
                            var enginecodenew = '';
                            var originalEngineCode = result[0][i].EDesc;
                            if (result[0][i].EDesc) {
                                if (result[0][i].EDesc.length > 4) {
                                    enginecode = result[0][i].EDesc.substring(0, 1) + '%'
                                        + result[0][i].EDesc.substring(1, 5) + '%' +
                                        result[0][i].EDesc.substring(5, result[0][i].EDesc.length);
                                }
                                else {
                                    enginecode = result[0][i].EDesc.substring(0, 1) + '%'
                                        + result[0][i].EDesc.substring(1, 3) + '%' +
                                        result[0][i].EDesc.substring(3, result[0][i].EDesc.length);
                                }
                            }
                            var query = "SELECT * FROM `gtl_passenger_cars` WHERE FullDescription LIKE '%volvo%" + model + "%' AND enginecode LIKE '" + enginecode + "'";
                            dbVIN.query(query)
                                .then(function (result) {
                                    if (result && result.length != 1) {
                                        var saleType = vinNumber.substr(3, 3);
                                        var query = "SELECT * FROM `gtl_passenger_cars` WHERE FullDescription LIKE '%volvo%" + model + "%" + saleType + "%' AND enginecode LIKE '" + enginecode + "'";
                                        dbVIN.query(query)
                                            .then(function (result) {
                                                if (result && result.length == 1) {
                                                    var data = [];
                                                    VolvoVINModel(vinNumber, originalEngineCode, year, result)
                                                        .then(function (response) {
                                                            data.push(response.Data);
                                                            var primaryOptionSubData = [];
                                                            data.push(primaryOptionSubData);
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
                                                    enginecodenew = enginecode + '%';
                                                    var query = "SELECT * FROM `gtl_passenger_cars` WHERE FullDescription LIKE '%volvo%" + model + "%' AND enginecode LIKE '" + enginecodenew + "'";
                                                    dbVIN.query(query)
                                                        .then(function (result) {
                                                            if (result && result.length == 1) {
                                                                var data = [];
                                                                VolvoVINModel(vinNumber, originalEngineCode, year, result)
                                                                    .then(function (response) {
                                                                        data.push(response.Data);
                                                                        var primaryOptionSubData = [];
                                                                        data.push(primaryOptionSubData);
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
                                                                return resolve({
                                                                    Status: HttpStatusCode.NOT_FOUND,
                                                                    Data: constants.NoDataFound
                                                                });
                                                            }
                                                        });
                                                }
                                            })
                                            .catch(function (error) {
                                                return reject(error);
                                            });
                                    }
                                    else if (result && result.length == 1) {
                                        var data = [];
                                        VolvoVINModel(vinNumber, originalEngineCode, year, result)
                                            .then(function (response) {
                                                data.push(response.Data);
                                                var primaryOptionSubData = [];
                                                data.push(primaryOptionSubData);
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
                                        return resolve({
                                            Status: HttpStatusCode.NOT_FOUND,
                                            Data: constants.NoDataFound
                                        });
                                    }
                                })
                                .catch(function (error) {
                                    return reject(error);
                                });
                        }
                        else {
                            i++;
                        }
                    }
                } else {
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
            })
            .catch(function (error) {
                return reject(error);
            });
    })
}

function GetGeneralVINDetails(response, result, vinNumber, IP, apiKeyId, resolve, reject) {
    var data = [];
    var subData = response.Data;
    var originalModel = subData["Model"];
    var sqlQuery = '';
    if (result[0].Make == 'Volvo') {
        sqlQuery = 'CALL ProcessVolvoVin(?)';
    }
    else if (result[0].Make == 'Kia') {
        sqlQuery = 'CALL ProcessKiaVin(?)';
    }
    else if (result[0].Make == 'Renault') {
        sqlQuery = 'CALL ProcessRenaultVin(?)';
    }
    else if (result[0].Make == 'Hyundai') {
        sqlQuery = 'CALL ProcessHyundaiVin(?)';
    }
    else if (result[0].Make == 'Mercedes') {
        sqlQuery = 'CALL ProcessMercedesVin(?)';
    }
    else if (result[0].Make == 'Opel') {
        sqlQuery = 'CALL ProcessOpelVin(?)';
    }
    else {
        sqlQuery = 'CALL ProcessVolvoVin(?)';
    }
    dbVIN.query(sqlQuery, [vinNumber])
        .then(function (vinResult) {
            if (vinResult[0][0].nKtype > 1) {
                subData["Drive"] = vinResult[0][0].nDriveType ? vinResult[0][0].nDriveType : "-";
                subData["BodyType"] = vinResult[0][0].nBodyType ? vinResult[0][0].nBodyType : "-";
                subData["PowerkW"] = vinResult[0][0].nkW ? vinResult[0][0].nkW + " kW" : "-";
                subData["PowerPS"] = vinResult[0][0].nPS ? vinResult[0][0].nPS + " PS" : "-";
                subData["Capacity"] = vinResult[0][0].nCCM ? vinResult[0][0].nCCM + " ccm" : "-";
                subData["FuelType"] = vinResult[0][0].nFuelType ? vinResult[0][0].nFuelType : "-";
                subData["FuelMixture"] = vinResult[0][0].nFuelMixture ? vinResult[0][0].nFuelMixture : "-";
                subData["K-type"] = vinResult[0][0].nKtype ? vinResult[0][0].nKtype : "-";
                subData["KBANr"] = vinResult[0][0].nKBANR ? vinResult[0][0].nKBANR.replace(' ', '') : "-";
                subData["Model"] = vinResult[0][0].nFullModel ? vinResult[0][0].nFullModel : subData["Model"];

                return ProcessDataForCodes(originalModel);
            }
            else {
                traffiDB.query("SELECT ktypenr01 FROM `trafidata02` WHERE `VINNumber`=?", [vinNumber])
                    .then(function (ktypeResult) {
                        if (ktypeResult.length > 0) {
                            dbVIN.query("SELECT * FROM `gtl_passenger_cars` WHERE ktypeid=?", [ktypeResult[0].ktypenr01])
                                .then(function (ktypePassengerCarResult) {
                                    if (ktypePassengerCarResult.length > 0) {
                                        subData["Drive"] = ktypePassengerCarResult[0].DriveType ? ktypePassengerCarResult[0].DriveType : "-";
                                        subData["BodyType"] = ktypePassengerCarResult[0].BodyType ? ktypePassengerCarResult[0].BodyType : "-";
                                        subData["PowerkW"] = ktypePassengerCarResult[0].Power_KW ? ktypePassengerCarResult[0].Power_KW : "-";
                                        subData["PowerPS"] = ktypePassengerCarResult[0].Power_PS ? ktypePassengerCarResult[0].Power_PS : "-";
                                        subData["Capacity"] = ktypePassengerCarResult[0].Capacity_Technical ? ktypePassengerCarResult[0].Capacity_Technical : "-";
                                        subData["FuelType"] = ktypePassengerCarResult[0].FuelType ? ktypePassengerCarResult[0].FuelType : "-";
                                        subData["FuelMixture"] = ktypePassengerCarResult[0].FuelMixture ? ktypePassengerCarResult[0].FuelMixture : "-";
                                        subData["K-type"] = ktypePassengerCarResult[0].ktypeid ? ktypePassengerCarResult[0].ktypeid : "-";
                                        subData["KBANr"] = ktypePassengerCarResult[0].KBANumber != null ? ktypePassengerCarResult[0].KBANumber.split(',')[0].replace(' ', '') : "-";
                                        subData["Model"] = ktypePassengerCarResult[0].FullDescription ? ktypePassengerCarResult[0].FullDescription : subData["Model"];
                                    }

                                    return ProcessDataForCodes(originalModel);
                                })
                                .catch(function (error) {
                                    return reject(error);
                                });
                        }
                        else {
                            return ProcessDataForCodes(originalModel);
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

    function ProcessDataForCodes(originalModel) {
        data.push(subData);
        //#region calculate technical Info data
        if (result[0].Equipment != null && result[0].Equipment != "") {
            var equipmentList = result[0].Equipment.split(';');
            equipmentList.splice(-1, 1);
            var equipmentSubData = [];
            equipmentList.forEach(element => {
                var equipmentSubDataList = element.split('::');
                var equipmentSubDataResult = {
                    "EQCode": equipmentSubDataList[0],
                    "Group": "-",
                    "Description": equipmentSubDataList[1]
                };
                if (equipmentSubDataList[1] != undefined && equipmentSubDataList[1].indexOf(" kW") != -1) {
                    equipmentSubDataList[1].replace(" KW", "KW");
                }
                if (equipmentSubDataList[1] != undefined &&
                    equipmentSubDataList[1].startsWith("ENGINE") &&
                    equipmentSubDataList[1].indexOf("kW") != -1) {
                    var enginedata = equipmentSubDataList[1].split(' ');
                    var ccm = enginedata[enginedata.length - 1].replace(/\D/g, '');
                    data[0].Capacity = data[0].Capacity != "-" ? data[0].Capacity : ccm + " ccm";
                    data[0].PowerkW = data[0].PowerkW != "-" ? data[0].PowerkW : equipmentSubDataList[1].substring(equipmentSubDataList[1].indexOf("kW") - 3, equipmentSubDataList[1].indexOf("kW")).trim() + " kW";
                    data[0].PowerPS = data[0].PowerPS != "-" ? data[0].PowerPS : Math.round(equipmentSubDataList[1].substring(equipmentSubDataList[1].indexOf("kW") - 3, equipmentSubDataList[1].indexOf("kW")).trim() * 1.363636) + " PS";
                }
                if (equipmentSubDataList[1] != undefined &&
                    equipmentSubDataList[1].startsWith("FUEL")) {
                    var fuels = equipmentSubDataList[1].split(' ');
                    if (fuels.length == 2) {
                        data[0].FuelType = data[0].FuelType != "-" ? data[0].FuelType : fuels[1];
                    }
                }
                if (equipmentSubDataResult.EQCode != '') {
                    equipmentSubData.push(equipmentSubDataResult);
                }
            });
            data.push(equipmentSubData);
        }
        //#endregion
        commonHelper.SaveLog(vinNumber, '1', IP, apiKeyId);
        commonHelper.IncrementCount(apiKeyId);
        return resolve({
            Status: HttpStatusCode.OK,
            Data: data,
            OriginalModel: originalModel
        });
    }
}

function GetGeneralVINModel(result) {
    return new Promise(function (resolve, reject) {
        try {
            var tempDateOfManufacture = result[0].DateOfProd;
            var DoM = '-';
            if (tempDateOfManufacture) {
                tempDateOfManufacture = tempDateOfManufacture.replace(/\s/g, '')
                DoM = new Date(tempDateOfManufacture).toISOString().slice(0, 10);
                DoM = tempDateOfManufacture.substring(tempDateOfManufacture.indexOf(',') - 2, tempDateOfManufacture.indexOf(','))
                    + DoM.substring(4, 8) + DoM.substring(0, 4);
            } else {
                DoM = result[0].YearOfProd ? result[0].YearOfProd.replace(/\s/g, '') : '-';
            }
            var subData = {
                "VINNumber": result[0].VIN,
                "Make": result[0].Make,
                "Model": result[0].Model,
                "MarketCode": result[0].ChassisCode ? result[0].ChassisCode.substring(0, 3) : '-',
                "DoM": DoM,
                "Engine": result[0].Engine ? result[0].Engine : "-",
                "Transmission": result[0].Transmission ? result[0].Transmission : "-",
                "Drive": result[0].DriveType ? result[0].DriveType : "-",
                "BodyType": result[0].BodyType ? result[0].BodyType : "-",
                "PowerkW": result[0].kW ? result[0].kW + " kW" : "-",
                "PowerPS": result[0].PS ? result[0].PS + " PS" : "-",
                "Capacity": result[0].EngineCapacity ? result[0].EngineCapacity + " ccm" : "-",
                "FuelType": result[0].FuelType ? result[0].FuelType : "-",
                "FuelMixture": result[0].FuelMixture ? result[0].FuelMixture : "-",
                "K-type": result[0].KTYPE ? result[0].KTYPE : "-",
                "KBANr": result[0].KBANR ? result[0].KBANR : "-"
            };

            return resolve({ Status: HttpStatusCode.OK, Data: subData, Message: '' });
        }
        catch (error) {
            return reject(error);
        }
    });
}

function VolvoVINModel(vinNumber, engineCode, year, result) {
    return new Promise(function (resolve, reject) {
        try {
            var subData = {
                "VINNumber": vinNumber,
                "Make": 'Volvo',
                "Model": result[0].FullDescription ? result[0].FullDescription : "-",
                "MarketCode": "-",
                "DoM": year,
                "Engine": engineCode ? engineCode : "-",
                "Transmission": result[0].TransmissionCode ? result[0].TransmissionCode : "-",
                "Drive": result[0].DriveType ? result[0].DriveType : "-",
                "BodyType": result[0].BodyType ? result[0].BodyType : "-",
                "PowerkW": result[0].Power_KW ? result[0].Power_KW : "-",
                "PowerPS": result[0].Power_PS ? result[0].Power_PS : "-",
                "Capacity": result[0].Capacity_Technical ? result[0].Capacity_Technical : "-",
                "FuelType": result[0].FuelType ? result[0].FuelType : "-",
                "FuelMixture": result[0].FuelMixture ? result[0].FuelMixture : "-",
                "K-type": result[0].ktypeid ? result[0].ktypeid : "-",
                "KBANr": result[0].KBANumber ? result[0].KBANumber.split(',')[0].replace(' ', '') : "-"
            };

            return resolve({ Status: HttpStatusCode.OK, Data: subData, Message: '' });
        }
        catch (ex) {
            return reject(error);
        }
    });
}