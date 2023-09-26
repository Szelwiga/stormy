const {MongoClient} = require("mongodb");
const config = require("./config.js");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

var formidable = require('formidable');
var https = require('https');
var fs = require('fs');
/*
	/fileupload { file: [<hex>], user: [<name>], token: [<token>] }

	/deployfile {
		file_name: [<hex>],
		auto_encryption: [<bool>],
		encryption: [<bool>],
		is_archive: [<bool>],
		from: [<device>],
		location: [<dir>],
		desc: [<description>]
		user: [<name>],
		token: [<token>]
	}

	/remotels { location: [<dir>], long: [<bool>], user: [<name>], token: [<token>]}

	/remotemkdir { location: [<dir>], user: [<name>], token: [<token>]}

	/checkiffileexists { file_name: [<name>], location: [<dir>], user: [<name>], token: [<token>]}

	/checkifdirexists { location: [<dir>], user: [<name>], token: [<token>]}

	/downloadbylink=<link> = {}

*/
async function makeid(length){
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}
function convertSize(sz) {
	var i = 0;
	var units = ['', ' kB', ' MB', ' GB', ' TB'];
	while (sz >= 1024) {
		sz /= 1024;
		i++;
	}
	return (Math.max(sz, 0.1).toFixed(1) + "").replaceAll(".0", "") + units[i];
}
async function clearPath(path){
	var full_path = '/' + path + '/';
	while (full_path != full_path.replaceAll('//', '/'))
		full_path = full_path.replaceAll('//', '/');
	return full_path;
}
async function fileDesc(file){
	var ret = file['is_archive'] ? "Package: " : "File: " ;
	ret += file['real_file_name'];
	ret += " located at ";
	ret += file['location'];
	ret += " uploaded from ";
	ret += file['from'];
	ret += " at ";
	ret += new Date(file['time']).toLocaleString('sv');
	ret += "\n";
	return ret;
}
async function longFileDesc(file){
	var ret = "    Name:            " + file['real_file_name'] + "\n";
	ret += "      Description:   " + file['desc'] + "\n";
	ret += "      Weight:        " + convertSize(file['weight']) + "\n";
	ret += "      Location:      " + file['location'] + "\n";
	ret += "      Type:          " + (file['is_archive'] ? "package" : "simple file") + "\n";
	ret += "      Encryption:    ";
	if (file['enctyption'])			ret += "password\n";
	if (file['auto_enctyption'])	ret += "auto encryption\n";
	if (ret[ret.length-1] == ' ')	ret += "none\n";
	ret += "      Uploaded from: " + file['from'] + "\n";
	ret += "      Uploaded at:   " + new Date(file['time']).toLocaleString('sv') + "\n";
	return ret;
}

function execShellCommand(cmd) {
	const exec = require('child_process').exec;
	return new Promise((resolve, reject) => {
		exec(cmd, {encoding: 'utf8'}, (error, stdout, stderr) => {
			if (error) {
				console.warn(error);
			}
		resolve(stdout? stdout : stderr);
		});
	});
}

https.createServer(config.options, function (req, res) {
	var form = new formidable.IncomingForm();
	form.parse(req, async function (err, fields, files) {
		if ((!fields['user'] || !fields['token']) && req.url.substr(0, 15) != '/downloadbylink') {
			res.write("OK\n");
			res.end();
			return;
		}
		const client = new MongoClient(config.url);
		try {
			await client.connect();
			const user_collection = client.db("stormy").collection("users");
			const dir_collection = client.db("stormy").collection("dir");
			const files_collection = client.db("stormy").collection("files");
			const links_collection = client.db("stormy").collection("links");

			if (req.url.substr(0, 15) == '/downloadbylink') {
				const find_link = await links_collection.findOne({ link: req.url.slice(1)});
				if (find_link){
					if (find_link['is_one_time'] && find_link['used']){
						res.write(config.used_link_redirect);
						res.end();
					} else {
						const update_result = await links_collection.updateOne(
							{ link: find_link['link'] }, { $inc: {used: 1} });
						const find_user = await user_collection.findOne({ name: find_link['owner'] });
						const find_file = await files_collection.findOne({
							owner: find_link['owner'],
							location: find_link['location'],
							real_file_name: find_link['real_file_name']});
						if (find_file && find_user){
							var path = config.stormy_directory + "storage/" + find_user["dir"] + "/" + find_file['server_file_name'];
							fs.exists(path, function (exists) {
								if (exists) {
									res.writeHead(200, {
										"Content-Type": "application/octet-stream",
										"Content-Disposition": "attachment; filename=" + find_file['real_file_name']
										});
									fs.createReadStream(path).pipe(res);
									return;
								} else {
									res.writeHead(400, { "Content-Type": "text/plain" });
									res.end("ERROR File does not exist");
									return;
								}
							});
						} else {
							res.write("File no longer exists!");
							res.end();
						}
					}
				} else {
					res.write("Incorrect link!");
					res.end();
				}
			} else {
				const find_user = await user_collection.findOne({ name: fields['user'][0] });
				if (!find_user) {
					res.write("Authorization failure: no user with name \"" + fields['user'][0] + "\" found!\n1");
					res.end();
				} else {
					const compare_result = await bcrypt.compare(fields["token"][0], find_user["token"]);
					if (compare_result) {

						if (req.url == '/fileupload') {

							var bytes = fields['file'][0];
							var b = new Buffer.alloc(bytes.length/2);
							for (var i=0; i<bytes.length; i+=2) {
								b[i/2] = parseInt(bytes[i]+bytes[i+1], 16);
							}
							if (fields['append']) {
								fs.appendFile(config.stormy_directory + "incoming_files/" + find_user["name"], b, "binary", function(err) {
									if(err) {
										console.log(err);
										res.write("Failed to save file on server!\n1");
										res.end();
									} else {
										res.write('OK\n0');
									 	res.end();
									}
								});
							} else {
								fs.writeFile(config.stormy_directory + "incoming_files/" + find_user["name"], b, "binary", function(err) {
									if(err) {
										console.log(err);
										res.write("Failed to save file on server!\n1");
										res.end();
									} else {
										res.write('Upload completed successfully!\n0');
									 	res.end();
									}
								});
							}

						} else if (req.url == '/deployfile') {
							if (!fs.existsSync(config.stormy_directory + "incoming_files/" + find_user["name"])) {
								res.write("There is no file to deploy for user: " + find_user["name"] + "!\n1");
								res.end();
								return;
							}
							var full_path = await clearPath(fields['location'][0]);
							const find_dir = await dir_collection.findOne({ owner: find_user["name"], dir: full_path });
							if (!find_dir){
								res.write("There is no directory: " + full_path + "!\n1");
								res.end();
								return;
							}
							var file_entry = {
								real_file_name: fields['file_name'][0].replaceAll('/', 'wrrrr'),
								server_file_name: crypto.randomBytes(32).toString('hex'),
								auto_enctyption: parseInt(fields['auto_encryption'][0], 10),
								enctyption: parseInt(fields['encryption'][0], 10),
								is_archive: parseInt(fields['is_archive'][0], 10),
								desc: fields['desc'][0],
								from: fields['device'][0],
								location: find_dir['dir'],
								owner: find_user['name'],
								weight: fs.statSync(config.stormy_directory + "incoming_files/" + find_user["name"]).size,
								time: Date.now()
							};
							fs.rename(config.stormy_directory + "incoming_files/" + find_user['name'], config.stormy_directory + "storage/" + find_user["dir"] + "/" + file_entry["server_file_name"], function (err) {
								if (err) console.log(err);
							});
							const delete_result = await files_collection.deleteOne({owner: file_entry['owner'], real_file_name: file_entry['real_file_name'], location: file_entry['location']});
							const insert_result = await files_collection.insertOne(file_entry);
							if (delete_result.deletedCount!=0)
								res.write("File overwrited on stormy: " + file_entry['real_file_name'] + "\n0");
							else
								res.write("File saved on stormy: " + file_entry['real_file_name'] + "\n0");
							res.end();

						} else if (req.url == '/checkiffileexists') {
							var full_path = await clearPath(fields['location'][0]);
							const find_file = await files_collection.findOne({owner: find_user['name'], real_file_name: fields['file_name'][0], location: full_path});
							if (find_file) {
								res.write(await fileDesc(find_file));
								res.write("0");
							} else {
								res.write("File: " + fields['file_name'][0] + " located at " + full_path + " does not exist.\n1");
							}
							res.end();

						} else if (req.url == '/checkifdirexists') {
							var full_path = await clearPath(fields['location'][0]);
							const find_dir = await dir_collection.findOne({dir: full_path, owner: find_user['name']});
							if (find_dir) {
								res.write("Dir: " + full_path + " exists\n0");
							} else {
								res.write("Dir: " + full_path + " does not exist\n1");
							}
							res.end();

						} else if (req.url == '/filestat') {
							var full_path = await clearPath(fields['location'][0]);
							const find_dir = await dir_collection.findOne({dir: full_path, owner: find_user['name']});
							if (find_dir) {
								const find_file = await files_collection.findOne({owner: find_user['name'], real_file_name: fields['file_name'][0], location: full_path});
								if (find_file){
									var path = config.stormy_directory + "storage/" + find_user['dir'] + "/" + find_file['server_file_name'];
									var desc = await longFileDesc(find_file);
									var stdout;
									stdout = await execShellCommand('md5sum ' + path);
									for (var i of desc.split("\n"))
										if (i != '')
											res.write(i.replace("    ", "") + "\n");
									res.write("  md5sum:        " + stdout.split(" ")[0] + "\n");
									res.write("0");
								} else {
									res.write("File: " + fields['file_name'][0] + " located at " + full_path + " does not exist.\n1");
								}
							} else {
								res.write("Dir: " + full_path + " does not exist\n1");
							}
							res.end();

						} else if (req.url == '/fileinfo') {
							var full_path = await clearPath(fields['location'][0]);
							const find_dir = await dir_collection.findOne({dir: full_path, owner: find_user['name']});
							if (find_dir) {
								const find_file = await files_collection.findOne({owner: find_user['name'], real_file_name: fields['file_name'][0], location: full_path});
								if (find_file){
									var info="";
									info += find_file['real_file_name'] + "/";
									info += find_file['is_archive'] ? "package" : "file";
									if (find_file['enctyption'])		info += "/pass";
									if (find_file['auto_enctyption'])	info += "/auto";
									res.write(info + "\n0");
								} else {
									res.write("File: " + fields['file_name'][0] + " located at " + full_path + " does not exist.\n1");
								}
							} else {
								res.write("Dir: " + full_path + " does not exist\n1");
							}
							res.end();

						} else if (req.url == '/remotels') {
							var full_path = await clearPath(fields['location'][0]);
							const find_dir = await dir_collection.findOne({dir: full_path, owner: find_user['name']});
							if (find_dir) {
								res.write("Content of directory: " + find_dir['dir'] + "\n")
								res.write("List of subdirectories:\n");
								const find_subdir = await dir_collection.find({parent: find_dir['dir'], depth: find_dir['depth']+1, owner: find_user['name']})
								for await (const subdir of find_subdir)
									res.write("    " + subdir['dir'] + "\n");
								res.write("List of files:\n");
								if (parseInt(fields['long'][0], 10))
									res.write("\n");
								const find_files = await files_collection.find({location: find_dir['dir'], owner: find_user['name']})
								for await (const file of find_files){
									if (parseInt(fields['long'][0], 10)){
										res.write(await longFileDesc(file));
										res.write("\n");
									} else {
										res.write("    ");
										res.write(await fileDesc(file));
									}
								}
								res.write("0");
							} else {
								res.write("Dir: " + full_path + " does not exist\n1");
							}
							res.end();

						} else if (req.url == '/remotemkdir') {
							var full_path = await clearPath(fields['location'][0]);
							const find_dir = await dir_collection.findOne({dir: full_path, owner: find_user['name']});
							if (find_dir) {
								res.write("Dir: " + full_path + " already exists\n1");
								res.end();
							} else {
								var prefix="/";
								var suffix="";
								for (var i=1; i<full_path.length-1; i++) {
									if (full_path[i]=='/') {
										prefix = prefix+suffix+'/';
										suffix = "";
									} else {
										suffix += full_path[i];
									}
								}
								const find_parent = await dir_collection.findOne({dir: prefix, owner: find_user['name']});
								if (find_parent) {
									var dir_entry = {
										dir: full_path,
										parent: find_parent['dir'],
										owner: find_parent['owner'],
										depth: find_parent['depth']+1
									};
									const insert_result = await dir_collection.insertOne(dir_entry);
									res.write("Created directory: " + full_path + "\n0");
									res.end();
								} else {
									res.write("Dir: " + prefix + " does not exist\n1");
									res.end();
								}
							}

						} else if (req.url == '/removedir') {
							var full_path = await clearPath(fields['location'][0]);
							const find_dir = await dir_collection.findOne({owner: find_user['name'], dir: full_path});
							if (find_dir) {
								const find_subdir = await dir_collection.findOne({owner: find_user['name'], parent: find_dir['dir']});
								if (!find_subdir) {
									const find_files = await files_collection.find({location: find_dir['dir'], owner: find_user['name']})
									var removed_files = 0;
									var removed_links = 0;
									for await (const file of find_files){
										var server_file_path = config.stormy_directory + "storage/" + find_user["dir"] + "/" + file['server_file_name'];
										fs.unlinkSync(server_file_path);
										var delete_result = await files_collection.deleteOne(file);
										var delete_links = await links_collection.deleteMany({
											location: file['location'],
											owner: file['owner'],
											real_file_name: file['real_file_name']});
										removed_files += delete_result.deletedCount;
										removed_links += delete_links.deletedCount;
									}
									if (find_dir['dir'] != '/')
										delete_result = await dir_collection.deleteOne(find_dir);
									else
										delete_result = {deletedCount: 0};
									res.write("Removed " + removed_files + " files/packages, " + removed_links + " links and " + delete_result.deletedCount + " directory.\n0");
									res.end();
								} else {
									res.write("Dir: " + full_path + " has subdir: " + find_subdir['dir'] + " \n1");
									res.end();
								}
							} else {
								res.write("Dir: " + full_path + " does not exist\n1");
								res.end();
							}
						} else if (req.url == '/removefile') {
							var full_path = await clearPath(fields['location'][0]);
							const find_file = await files_collection.findOne({owner: find_user['name'], real_file_name: fields['file_name'][0], location: full_path});
							if (find_file) {
								var server_file_path = config.stormy_directory + "storage/" + find_user["dir"] + "/" + find_file['server_file_name'];
								fs.unlinkSync(server_file_path);
								var delete_result = await files_collection.deleteOne(find_file);
								var delete_links = await links_collection.deleteMany({
									location: find_file['location'],
									owner: find_file['owner'],
									real_file_name: find_file['real_file_name']});
								if (delete_result.deletedCount!=0){
									res.write("Removed file from stormy!\n");
									res.write("Removed " + delete_links.deletedCount + " links!\n0");
								} else {
									res.write("Failed to remove file!\n1");
								}
								res.end();
								return;
							} else {
								res.write("File: " + fields['file_name'][0] + " located at " + full_path + " does not exist.\n");
								res.write("1");
							}
							res.end();

						} else if (req.url == '/createlink') {
							var full_path = await clearPath(fields['location'][0]);
							const find_file = await files_collection.findOne({owner: find_user['name'], real_file_name: fields['file_name'][0], location: full_path});
							if (find_file) {
								var link_entry = {
									owner: find_user['name'],
									//link: "downloadbylink=" + crypto.randomBytes(32).toString('hex'),
									link: "downloadbylink=" + await makeid(12),
									real_file_name: find_file['real_file_name'],
									location: find_file['location'],
									is_one_time: parseInt(fields['one_time_link'][0], 10),
									used: 0,
									desc: fields['desc'][0]
								};
								const insert_result = await links_collection.insertOne(link_entry);
								res.write(config.link_prefix + link_entry['link']);
								res.write("\n0");

								/*
								if (parseInt(fields['one_time_link'][0], 10)) {
									const insert_result = await links_collection.insertOne(link_entry);
									res.write(link_entry['link']);
									res.write("\n0");
									console.log("Phi");
								} else {
									const find_link = await links_collection.findOne({
										owner: find_file['owner'],
										location: find_file['location'],
										real_file_name: find_file['real_file_name'],
										is_one_time: 0});
									if (find_link){
										res.write(find_link['link']+"\n0");
									} else {
										const insert_result = await links_collection.insertOne(link_entry);
										res.write(link_entry['link']);
										res.write("\n0");
									}
								}
								*/
							} else {
								res.write("File: " + fields['file_name'][0] + " located at " + full_path + " does not exist.\n");
								res.write("1");
							}
							res.end();

						} else if (req.url == '/listlinks') {
							var full_path = await clearPath(fields['location'][0]);
							const find_file = await files_collection.findOne({owner: find_user['name'], real_file_name: fields['file_name'][0], location: full_path});
							if (find_file) {
								const find_links = await links_collection.find({
									owner: find_file['owner'],
									real_file_name: find_file['real_file_name'],
									location: find_file['location']});
								if (find_file['is_archive'])
									res.write("Links for package: " + find_file['real_file_name'] + " located at " + find_file['location'] + "\n");
								else
									res.write("Links for file: " + find_file['real_file_name'] + " located at " + find_file['location'] + "\n");
								if (parseInt(fields['long'][0], 10))
									res.write("\n");
								for await (const link of find_links){
									if (parseInt(fields['long'][0], 10)) {
										res.write("    " + config.link_prefix + link['link'] + "\n");
										res.write("      ID: " + link['link'].replaceAll("downloadbylink=", "") + "\n");
										res.write("      Description: " + link['desc'] + "\n");
										if (link['is_one_time'])
											res.write("      This link is one time use.\n");
										if (link['used'])
											res.write("      This link was used " + link['used'] + " " + (link['used'] == 1 ? 'time' : 'times') + ".\n");
										res.write("\n");
									} else {
										if (link['is_one_time'])
											res.write("    One time link: " + config.link_prefix + link['link'] + "\n");
										else
											res.write("    Link:          " + config.link_prefix + link['link'] + "\n");
									}
								}
								res.write("0");
							} else {
								res.write("File: " + fields['file_name'][0] + " located at " + full_path + " does not exist.\n");
								res.write("1");
							}
							res.end();

						} else if (req.url == '/removelink') {
							const delete_result = await links_collection.deleteOne({
								owner: find_user['name'],
								link: "downloadbylink=" + fields['link'][0]});
							if (delete_result.deletedCount!=0) {
								res.write("Removed link!\n0");
							} else {
								res.write("Link with ID: " + fields['link'][0] + " not found!\n1");
							}
							res.end();
						} else if (req.url == '/removelinks') {
							var full_path = await clearPath(fields['location'][0]);
							const find_file = await files_collection.findOne({owner: find_user['name'], real_file_name: fields['file_name'][0], location: full_path});
							if (find_file) {
								const delete_result = await links_collection.deleteMany({
									owner: find_user['name'],
									location: find_file['location'],
									real_file_name: find_file['real_file_name']
									});
								res.write("Removed " + delete_result.deletedCount + " links!\n0");
							} else {
								res.write("File: " + fields['file_name'][0] + " located at " + full_path + " does not exist.\n");
								res.write("1");
							}
							res.end();
						} else {
							res.write('jaf23fu9nes08dfhsnbvz0sdvhzs0d9yhs8fd85zsdf87\n0');
							res.end();
						}
					} else {
						res.write("Authorization failure: wrong token!\n1");
						res.end();
					}
				}
			}
		} catch (err) {
			res.write("Server side error!\n");
			res.write("Probably caused by wrong API call!\n1");
			res.end();
			console.log(err.stack);
		} finally {
			client.close();
		}
	});
}).listen(2003);


