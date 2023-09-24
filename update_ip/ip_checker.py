#!/bin/python3
import urllib.request
import re

def get_ip():
	try:
		user_agent = 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.0.7) Gecko/2009021910 Firefox/3.0.7'
		headers={'User-Agent':user_agent,}
		provider = 'http://www.myip.com/'
		request=urllib.request.Request(provider,None,headers)

		with urllib.request.urlopen(request) as f:
			page_text = f.read().decode('utf-8')

		machine = re.compile("(?:[0-9]{1,3}\.){3}[0-9]{1,3}")

		links = [url.group() for url in machine.finditer(page_text)]
		print(links[0])
	except:
		print("fail")
get_ip()
