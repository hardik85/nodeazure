var mysql = require('mysql');
//************************DATABASE CONNECTIVITY********************* */
var connection = mysql.createConnection({
    // host: '10.0.3.87',
    // user: 'ojdevteam',
    // password: 'Gtl@12345',
    // database: "staging_vis_db" 
    host: '10.0.1.43',
    user: 'vis_user',
    password: 'Vis256$$',
    database: "staging_vis_db"   
});
connection.connect(function (err) {
    if (err) {
        console.log(err);
        console.log("Error in connecting database ...");
    } else {
        console.log("staging_vis_db Database is connected...");
    }
});
module.exports = connection;