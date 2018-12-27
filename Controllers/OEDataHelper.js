var db = require('../connection');
var HttpStatusCode = require('http-status-codes');
var bmwHelper = require('./BMWHelper');
var generalVINHelper = require('./GeneralVINHelper');

var constants = require('../utils/constants');

exports.IdentifyAndProcessVIN = function (vinNumber, languageCode, categoryCode, iso, regiso, IP, apiKeyId) {
    return new Promise(function (resolve, reject) {

        var WMI = vinNumber.substring(0, 3);
        var WMI2 = vinNumber.substring(0, 2);

        db.query("SELECT Service FROM wmicodes WHERE WMI = ? OR WMI = ? AND Service IS NOT NULL", [WMI, WMI2])
            .then(function (result) {
                if (result[0].Service == "BMW") {
                    bmwHelper.ProcessVINForOEData(vinNumber, categoryCode, iso, regiso, IP, apiKeyId)
                        .then(function (response) {
                            return resolve({
                                Status: response.Status,
                                Data: response.Data,
                                Make: result[0].Service
                            });
                        })
                        .catch(function (error) {
                            return reject(error);
                        });
                }
                else if (result != undefined && result[0] != undefined && (result[0].Service == "VOL")) {
                    generalVINHelper.ProcessVINForOEData(vinNumber, languageCode, categoryCode, IP, apiKeyId)
                        .then(function (response) {
                            return resolve({
                                Status: response.Status,
                                Data: response.Data,
                                Make: result[0].Service
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
    });
}
