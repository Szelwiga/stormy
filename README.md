## Stormy
> Command line tool for online drive with it's own dedicated API. <br>
> Allows to fast upload, download and linking files from terminal.

#### Doesn't require static IP!

#### Stormy git contains following subsections:
* Stormy CLI - Command line tool used as overlay for API, written in bash + python for API requests
* Stormy API - Online drive API written in nodejs
* Stormy linker - Small static website that redirects to changed ip
* Stormy update_ip - Systemd daemon + script that notify about ip changes
> Stormy online - Planned to make online version to browse uploaded files in web

### Stormy CLI

Some of the features:
```
	stormy upload -s -d location_on_server local_file1 local_file2 # uploads file to server
	stormy download /location_on_server/file1 # downloads file from server
	stormy ls /location_on_server # list content of directory on server
	stormy link file1 # creates download link for file on stormy
	man ./stormy.man # full manual for stormy CLI
```
Installation:
* Make installer runable ```chmod +x install.sh```
* Install to choosen location ```./install.sh /target/location/of/stormy``` 
* Set up file ```~/.config/stormy/config``` 

### Stormy API

```
	node add_user.js --email a@b.com --name user --pass pass # Creates new user
	node API.js # runs API
```
Installation:
* Set up ```config.js``` file
* Create proper directories using ```./make_dirs.sh``` script
* Create daemon with ```stormy_api.service``` or run with ```node API.js```

### Stormy Linker:
Page that redirects to current API ip, with script that updates this ip (in case of github pages hosting).
> Needs to be finished, but it's working

### Stormy update_ip

Script with daemon that changes IP

Installation:
* Set up ```sendip.js``` with email account that will notify you about ip change
* Set proper paths in ```ip_update``` script including path to linker to automatily push changes to linker
* Create daemon with ```update_ip.service```

### Planned TODO:
* Create stormy online and beautify linker
* Documentation for API
