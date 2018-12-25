var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
router = express.Router({
    caseSensitive: false
});

var OEDataCtrl = require('../Controllers/OEDataController');

/* GET method to fetch data for VIN Number  */
router.get('/OEPartsByCategory/:vinnumber/:categorycode/:iso?/:regiso?', function (req, res, next) {
    return OEDataCtrl.OEPartsByCategory(req, res, next);
});

module.exports = router;