#!/bin/python3
import requests
import sys
import math
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

chunk_current = 0
chunk_size = 4000000
if len(A) <= chunk_size:
	print("Uploading file in one chunk.")
	files = {'file': A, 'user': sys.argv[2], 'token': sys.argv[3]}
	r = requests.post(url, files=files, verify=False)
	if r.ok:
		print(remove_last_line(r.text))
		exit(ord(r.text[-1])-48)
	else:
		print("Something went wrong!")
		exit(1)
else:
	chunk_cnt = math.ceil(len(A)/chunk_size)
	print("Uploading file in " + str(chunk_cnt) + " chunks.")
	print("Progress " + str(0) + "/" + str(chunk_cnt) + " - (" + str(round((100)/chunk_cnt)) + "%)", end='\r')
	for i in range(chunk_cnt):
		low = i * chunk_size
		high = min((i+1) * chunk_size, len(A))
		if low == 0:
			files = {'file': A[low:high], 'user': sys.argv[2], 'token': sys.argv[3]}
		else:
			files = {'file': A[low:high], 'user': sys.argv[2], 'token': sys.argv[3], 'append': 1}
		r = requests.post(url, files=files, verify=False)
		if r.ok and r.text[-1] == '0':
			print("Progress " + str(i+1) + "/" + str(chunk_cnt) + " - (" + str(round(100*(i+1)/chunk_cnt)) + "%)", end='\r')
			sys.stdout.flush()
		else:
			print("Failed while uploading file!")
			exit(1)
	print("")
	print("Upload completed successfully!")
