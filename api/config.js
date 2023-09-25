var fs = require('fs');

const url = "URL TO MONGO DB"; // FILL ME
const stormy_directory = "path to api js";
const options = {
    key: fs.readFileSync(stormy_directory + 'key.pem'),
    cert: fs.readFileSync(stormy_directory + 'cert.pem')
} // note that u need to genereate certificate and key
const link_prefix = "" // link to linker
const used_link_redirect = '<script> document.location.href = "link to linker used"</script>'
module.exports = {url, stormy_directory, options, link_prefix, used_link_redirect};
