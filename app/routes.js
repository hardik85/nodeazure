var db = require('../connection');

function getTodos(req, res) {

    db.query("SELECT Id, AllowedAPICallInOneMinute, UserId FROM `gtl_api_key` \
                WHERE `SecretKey` = ? and Active=1", [req.query.apikey], function (err, result, fields) {
            if (result[0] == undefined) {
                res.json("Your key is : " + req.query.apikey); // return all todos in JSON format};
            }
            else
            {
                res.json("Your key is : " + req.query.apikey); // return all todos in JSON format};
            }
        });


}
module.exports = function (app) {

    // api ---------------------------------------------------------------------
    // get all todos
    app.get('/api/todos', function (req, res) {
        // use mongoose to get all todos in the database
        getTodos(req, res);
    });
};