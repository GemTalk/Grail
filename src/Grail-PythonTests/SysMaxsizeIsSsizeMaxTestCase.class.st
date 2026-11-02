Class {
	#name : 'SysMaxsizeIsSsizeMaxTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SysMaxsizeIsSsizeMaxTestCase >> testSysMaxsizeIsPySsizeTMaxAndTheSizeChecksAgreeWithIt [
	"tests/python/sys_maxsize_is_ssize_max.py: sys.maxsize is 2**63 - 1, so
	_pydecimal takes its 64-bit limits, a length or a slice bound at the limit
	is taken, and a length, a '*' width, a literal width and a bytes repeat
	count past it are refused as CPython refuses them.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'sys_maxsize_is_ssize_max' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_maxsize_is_ssize_max.py')
		name: 'sys_maxsize_is_ssize_max'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
