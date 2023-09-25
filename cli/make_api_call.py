#!/bin/python3
import requests
import sys

# Make api call with python

# Usage:
# ./upl.py <url> <user> <token> <pairs of field and it's values>  

def remove_last_line(s):
	return s[:s.rfind('\n')]

url = sys.argv[1];

arguments = {'user': sys.argv[2], 'token': sys.argv[3]}

for i in range(4, len(sys.argv), 2):
	arguments[sys.argv[i]] = sys.argv[i+1].replace("_space_", " ")

#print(arguments)
#print(url)
try:
	r = requests.post(url, files=arguments, verify=False)
	if r.ok:
		print(remove_last_line(r.text))
		#exit(ord(r.text[-1])-48)
	else:
		print("Something went wrong!")
		exit(1)
except:
	print("Failed to make api call!")
	exit(2)

exit(ord(r.text[-1])-48)

