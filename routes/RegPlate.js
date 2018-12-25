var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
router = express.Router({
    caseSensitive: false
});

var regPlateInfoCtrl = require('../Controllers/RegPlateController.js');

router.get('/RegPlateInfo', function (req, res) {        
    return regPlateInfoCtrl.getRegPlateInfo(req, res);
});

module.exports = router;