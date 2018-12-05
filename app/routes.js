var db = require('../connection');

function getTodos(req, res) {

    //res.json("Your VIN number is : " + req.query.vinnumber); // return all todos in JSON format};

    db.query("SELECT * FROM `audi_engines`", [], function (err, result, fields) {
            if (result[0] == undefined) {
                res.json("Your key is : " + req.query.apikey); // return all todos in JSON format};
            }
            else {
                res.json("Audi's first engine code : " + result[0].EC); // return all todos in JSON format};
            }
        });
}
module.exports = function (app) {

    // api ---------------------------------------------------------------------
    // get all todos
    app.get('/api/vin', function (req, res) {
        // use mongoose to get all todos in the database
        getTodos(req, res);
    });
};