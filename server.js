var express = require('express');
var app = express();

var port = process.env.BACKEND_PORT || process.env.PORT || 3000;

app.get('/', function (req, res) {
    res.json("From main page");
});

require('./app/routes.js')(app);

app.listen(port);

console.log('Server Listening at port ' + port);