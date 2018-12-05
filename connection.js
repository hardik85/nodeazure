var mysql = require('mysql');
//************************DATABASE CONNECTIVITY********************* */
var connection = mysql.createConnection({
    // host: '10.0.3.87',
    // user: 'ojdevteam',
    // password: 'Gtl@12345',
    // database: "staging_vis_db" 
    host: 'autodapdb01.mariadb.database.azure.com',
    user: 'sadmin@autodapdb01',
    password: '@Lpha00256$$',
    database: "vindata_additional"   
});
connection.connect(function (err) {
    if (err) {
        console.log(err);
        console.log("Error in connecting database ...");
    } else {
        console.log("vindata_additional Database is connected...");
    }
});
module.exports = connection;