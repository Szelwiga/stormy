var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
	service: 'gmail', // set it up
	auth: {
		user: 'abc@gmail.com', // set it up
		pass: 'abc' // set it up
	}
});

var mailOptions = {
	from: 'abc@gmail.com', // set ip up
	to: 'to@gmail.com', // set it up
	subject: 'Server /* Your server name */ ip change notify.', // set it up
	text: 'The new ip is: ' + process.argv[2] + '\n' + 'Email was send by ip_update daemon.\n'
};

transporter.sendMail(mailOptions, function(error, info){
	if (error) {
		console.log("fail");
		console.error(error);
	} else {
		console.log("OK");
		console.error('Email sent: ' + info.response);
	}
});

