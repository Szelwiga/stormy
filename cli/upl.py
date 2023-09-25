#!/bin/python3
import requests
import sys

# Sending file as hex coded text with python upload

# Usage:
# ./upl.py <filename> <stormy_user> <token> <url> 

def remove_last_line(s):
	return s[:s.rfind('\n')]

url = sys.argv[4];
A = ""
T = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"]

#print("Preparing file to upload.")

with open(sys.argv[1], 'rb') as f:
	while 1:
		byte_s = f.read(1)
		if not byte_s:
			break
		byte = byte_s[0]
		A += T[byte//16]
		A += T[byte%16]

files = {'file': A, 'user': sys.argv[2], 'token': sys.argv[3]}

#print("Uploading file.")

r = requests.post(url, files=files, verify=False)
if r.ok:
	print(remove_last_line(r.text))
	exit(ord(r.text[-1])-48)
else:
	print("Something went wrong!")
	exit(1)
