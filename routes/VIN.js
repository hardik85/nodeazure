var express = require('express');
var router = express.Router();
router = express.Router({
    caseSensitive: false
});

var vinCtrl = require('../Controllers/VINController.js');

/* GET method to fetch data for VIN Number  */
router.get('/VINInfoExt/:languageCode?/:vinnumber', function (req, res, next) {
    return vinCtrl.getVINDetails(req, res, next);
});

module.exports = router;