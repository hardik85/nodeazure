var db = require('../connection');
var HttpStatusCode = require('http-status-codes');
var vagHelper = require('./VAGHelper');
//var bmwHelper = require('./BMWHelper');
//var generalVINHelper = require('./GeneralVINHelper');

var constants = require('../utils/constants');

exports.IdentifyAndProcessVIN = function (vinNumber, languageCode, IP, apiKeyId) {
    return new Promise(function (resolve, reject) {

        var WMI = vinNumber.substring(0, 3);
        var WMI2 = vinNumber.substring(0, 2);

        db.query("SELECT Service FROM wmicodes WHERE WMI = ? OR WMI = ? AND Service IS NOT NULL", [WMI, WMI2])
            .then(function (result) {
                if (result != undefined && result.length == 1) {
                    if (result[0].Service == "VAG") {
                        vagHelper.ProcessVIN(vinNumber, languageCode, IP, apiKeyId)
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
                    else if (result[0].Service == "BMW") {
                        // bmwHelper.ProcessVIN(vinNumber, languageCode, IP, apiKeyId)
                        //     .then(function (response) {
                        //         return resolve({
                        //             Status: response.Status,
                        //             Data: response.Data
                        //         });
                        //     })
                        //     .catch(function (error) {
                        //         return reject(error);
                        //     });
                    }
                    else if (result != undefined && result[0] != undefined && (result[0].Service == "VOL" || result[0].Service == "HYN"
                        || result[0].Service == "KIA" || result[0].Service == "REN" || result[0].Service == "OPL"
                        || result[0].Service == "MER")) {
                        // generalVINHelper.ProcessVIN(vinNumber, languageCode, IP, apiKeyId, result[0].Service)
                        //     .then(function (response) {
                        //         return resolve({
                        //             Status: response.Status,
                        //             Data: response.Data
                        //         });
                        //     })
                        //     .catch(function (error) {
                        //         return reject(error);
                        //     });
                    }
                    else {
                        return resolve({
                            Status: HttpStatusCode.NOT_FOUND,
                            Data: constants.NoDataFound
                        });
                    }
                }
                else if (result != undefined && result.length == 2) {
                    if (WMI == "KNM" || WMI2 == "KN") {
                        generalVINHelper.ProcessVIN(vinNumber, languageCode, IP, apiKeyId, result[0].Service)
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
                            Status: HttpStatusCode.NOT_FOUND,
                            Data: constants.NoDataFound
                        });
                    }
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
