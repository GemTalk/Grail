Class {
	#name : 'OsUnameTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
OsUnameTestCase >> testOsUnameAnswersTheFiveNamesInAUnameResult [

	"tests/python/os_uname.py: os.uname() answers a posix.uname_result of five
	fields, sysname, nodename, release, version and machine, each a nonempty str
	with no NUL in it, the system being the platform's.  Each check agrees with
	CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'os_uname' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_uname.py')
		name: 'os_uname'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
