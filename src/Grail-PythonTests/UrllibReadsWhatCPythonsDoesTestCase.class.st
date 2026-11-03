Class {
	#name : 'UrllibReadsWhatCPythonsDoesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UrllibReadsWhatCPythonsDoesTestCase >> testHttpZeroNineAndFtpReadAsCPythonsDo [
	"tests/python/urllib_reads_what_cpythons_does.py: http.client reads an
	HTTP/0.9 status line as HTTP/1.0 and refuses an unknown version, and
	ftplib is CPython's, which urllib.request refuses a host-less ftp: URL
	through.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'urllib_reads_what_cpythons_does' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/urllib_reads_what_cpythons_does.py')
		name: 'urllib_reads_what_cpythons_does'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
