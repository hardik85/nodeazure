// var express = require('express');
// var app = express();

// var port = process.env.BACKEND_PORT || process.env.PORT || 3000;

// app.get('/', function (req, res) {
//     res.json("From main page");
// });

// require('./app/routes.js')(app);

// app.listen(port);

// console.log('Server Listening at port ' + port);

var express = require('express');
var app = express();

var cors = require('cors');
var bodyParser = require('body-parser');
var HttpStatusCode = require('http-status-codes');

// Routes files
var vinRoutes = require('./routes/VIN');
// var regPlateRoutes = require('./routes/RegPlate');
// var oeDataRoutes = require('./routes/OEData');

// contorllers
var commonHelper = require('./Controllers/CommonHelper');

var corsOptions = {
  origin: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/VIN', vinRoutes);
// app.use('/RegPlate', regPlateRoutes);
// app.use('/OEData', oeDataRoutes);

// Invalid URL handling
app.use(function (req, res, next) {
    res.status(HttpStatusCode.BAD_REQUEST).json("Invalid URL");
});

// Handle errors
app.use(function (err, req, res, next) {
    handleError(err, req, next);
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        data: err.errno != undefined ? 'Something went wrong! Please contact Administrator with Error Number-' + err.errno : "Something went wrong! Please contact Administrator"
    });
});

app.use(function (req, res, next) {        
    var headers = {};

    //set header to handle the CORS    
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With, ApiTestKey';
    headers['Access-Contrl-Allow-Methods'] = 'PUT, POST, GET, DELETE, OPTIONS';
    headers["Access-Control-Max-Age"] = '86400';
    headers['Access-Control-Allow-Credentials'] = true;
    res.writeHead(200, headers);

     if ( req.method === 'OPTIONS' ) {
        console.log('OPTIONS SUCCESS');        
    }

    next();
});

// Error handling function to insert error log into DB.
function handleError(err, req) {
    commonHelper.LogError(req, new Date().toISOString().slice(0, 19).replace('T', ' '), req.headers["apikey"], req.path, err);
}

var port = process.env.BACKEND_PORT || process.env.PORT || 3000;
app.listen(port);