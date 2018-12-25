var nodemailer = require('nodemailer');

module.exports.mail = function (message) {
    // var transporter = nodemailer.createTransport({
    //     service: 'Gmail',
    //     //Authentication Details
    //     auth: {
    //         user: 'gatewaytechnolabs123@gmail.com',
    //         pass: 'Password12$',
    //     }
    // })
    // subject = message.code ? 'Staging Connection Error: ' + message.code : 'Staging Service Error: INTERNAL_SERVER_ERROR';
    // //compose the mail
    // var mailOptions = {
    //     from: 'gatewaytechnolabs123@gmail.com',
    //     to: 'hardik.pancholi@gatewaytechnolabs.com',
    //     subject: subject,
    //     html: message.message
    // }
    // //Sending mail
    // transporter.sendMail(mailOptions, function (error, info, next) {
    //     if (error) {
    //         cb(null, error);
    //     }
    //     else {
    //         cb(null, "err");
    //     }
    // })
    // var mailOptions = {
    //     from: 'gatewaytechnolabs123@gmail.com',
    //     to: 'devanshi.piprottar@gatewaytechnolabs.com',
    //     subject: subject,
    //     html: message.message
    // }
    // //Sending mail
    // transporter.sendMail(mailOptions, function (error, info, next) {
    //     if (error) {
    //         cb(null, error);
    //     }
    //     else {
    //         cb(null, "err");
    //     }
    // })
} 