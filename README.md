## Stormy
> Command line tool for online drive with it's own dedicated API. <br>
> Allows to fast upload, download and linking files from terminal.

#### Doesn't require static IP!

#### Stormy git contains following subsections:
* Stormy cli -- Command line tool used as overlay for API, written in bash + python for API requests
* Stormy API -- Online drive API written in nodejs
* Stormy linker -- Small static website that redirects to changed ip
* Stormy update_ip -- Systemd daemon + script that notify about ip changes
> Stormy online -- Planned to make online version to browse uploaded files in web

### Stormy cli

Some of the features:
```
	stormy upload -s -d location_on_server local_file1 local_file2 # uploads file to server
	stormy download /location_on_server/file1 # downloads file from server
	stormy ls /location_on_server # list content of directory on server
	stormy link file1 # creates download link for file on stormy
	man stormy.man # full manual for stormy CLI
```
Installation:
* Add stormy dir to path or make alias ```alias stormy="/path/to/stormy/stormy"``` in ```.bashrc```
* Set variable ```stormy_cli_dir="path to stormy"```
* Set up config file

### Stormy API

```

```
