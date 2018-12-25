var mysql = require('promise-mysql');
//************************DATABASE CONNECTIVITY********************* */
var pool = mysql.createPool({
    connectionLimit: 10,
    multipleStatements: true,
    host: 'autodapdb01.mariadb.database.azure.com',
    user: 'sadmin@autodapdb01',
    password: '@Lpha00256$$',
    database: "bmw_data_20180619"
});

pool.query('SELECT 1 + 1 AS solution', function (err, rows, fields) {
    if (err) throw err;

    console.log('bmw_data_20180619 is connected.');
});

module.exports = pool;