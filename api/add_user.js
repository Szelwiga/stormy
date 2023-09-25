const { MongoClient } = require("mongodb");
const { exec } = require("child_process");
const config = require("./config.js");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

async function add_user(){
	var argv = require('minimist')(process.argv.slice(2));
	if (argv.hasOwnProperty('pass') && argv.hasOwnProperty('name') && argv.hasOwnProperty('email')){

		var new_user = {};
		var real_token = crypto.randomBytes(32).toString('hex');
		new_user['pass'] = await bcrypt.hash(argv['pass'], 8);
		new_user['token'] = await bcrypt.hash(real_token, 8);
		new_user['dir'] = argv['name'];	// TODO: Clear from ugly characters
		new_user['name'] = argv['name'];
		new_user['email'] = argv['email'];

		const client = new MongoClient(config.url);
		try {
			await client.connect();
			const dbName = "stormy";
			const collectionName = "users";
			const database = client.db(dbName);
			const collection = database.collection(collectionName);

			const find_result = await collection.findOne({ name: new_user['name'] });
			if (find_result===null) {
				const insert_result = await collection.insertOne(new_user);
				const dir_collection = client.db(dbName).collection("dir");

				const insert_result_dir = await dir_collection.insertOne({owner: new_user["name"], dir: "/", depth: 0, parent: ''});
				exec("mkdir " + config.stormy_folder + "/storage/" + new_user["dir"], (error, stdout, stderr) => {});

				console.log("Created new user!");
				console.log("Name:  " + new_user["name"]);
				console.log("Email: " + new_user["email"]);
				console.log("Dir:   " + new_user["dir"]);
				console.log("");
				console.log("---Stormy CLI config---");
				console.log('token="' + real_token + '"');
				console.log('dir="storage/' + new_user["dir"] + '"');
				console.log('user="' + new_user["name"] + '"');

			} else {
				console.log("This username is already taken!");
			}

		} catch (err) {
			console.log(err.stack);
		}
		finally {
			await client.close();
		}
	} else {
		console.log("To create new user you need to specify:\n --email\n --name\n --pass\n");
	}
}
add_user().catch(console.dir);
