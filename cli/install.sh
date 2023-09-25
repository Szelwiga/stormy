
if [ "x$1" == "x" ]; then
	echo "Specify target location!"
	exit 1
fi
echo "Creating dir: $1/stormy"
mkdir $1/stormy
A=$1/stormy
echo "Moving file stormy to: $A"
cp stormy $A/
echo "Moving file config to: $A"
cp config $A/
echo "Moving file make_api_call.py to: $A"
cp make_api_call.py $A/
echo "Moving file stormy.man to: $A"
cp stormy.man $A/
echo "Moving file stormy_help to: $A"
cp stormy_help $A/
echo "Moving file stormy_parse_options to: $A"
cp stormy_parse_options $A/
echo "Moving file upl.py to: $A"
cp upl.py $A/

echo "Making file stormy executable."
chmod +x $A/stormy
echo "Making file config executable."
chmod +x $A/config
echo "Making file stormy_parse_options executable."
chmod +x $A/stormy_parse_options
echo "Making file stormy_help executable."
chmod +x $A/stormy_help
echo "Making file make_api_call.py executable."
chmod +x $A/make_api_call.py
echo "Making file upl.py executable."
chmod +x $A/upl.py

cat ~/.bashrc | grep "alias stormy=" > /dev/null
if [ $? == "0" ]; then
	echo "Detected alias in .bashrc"
	cat ~/.bashrc | grep "alias stormy"
else
	echo "Adding alias to .bashrc"
	echo "alias stormy=\"$A/stormy\"" >> ~/.bashrc
fi
if [ -e ~/.config/stormy/config ]; then
	echo "Detected config file in ~/.config/stormy/"
else
	echo "Creating config file in ~/.config/stormy/ (creating directory)"
	mkdir ~/.config/stormy/
	echo "Creating config file in ~/.config/stormy/ (copying basic config)"
	cp config ~/.config/stormy/config
fi
