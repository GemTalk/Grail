Class {
	#name : 'OsPathTakesAnyLoneSurrogateTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
OsPathTakesAnyLoneSurrogateTestCase >> testOsPathJoinsSplitsAndAsksAboutANameHoldingAnyLoneSurrogate [
	"tests/python/os_path_takes_any_lone_surrogate.py: a name holding a lone
	surrogate outside U+DC80..U+DCFF joins, splits, normalises and keeps
	through abspath and expanduser, the predicates answer no to it, realpath,
	getsize and os.stat still refuse it, and filecmp counts it a funny file.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'os_path_takes_any_lone_surrogate' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_path_takes_any_lone_surrogate.py')
		name: 'os_path_takes_any_lone_surrogate'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
