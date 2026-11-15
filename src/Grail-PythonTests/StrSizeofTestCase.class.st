Class {
	#name : 'StrSizeofTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Str' }
StrSizeofTestCase >> testAStrReportsCPythonsStrModel [
	"tests/python/str_sizeof.py: s.__sizeof__() and sys.getsizeof(s) answer
	CPython's str model -- 40 bytes plus n + 1 for an ASCII str, 56 plus
	(n + 1) * kind for any other exact str (surrogates included), 64 plus
	(n + 1) * kind for a subclass instance or StrEnum member, and 61 for a
	one-character Latin-1 str -- and a str of nearly sys.maxsize characters is
	MemoryError.  Each check agrees with CPython 3.14 (test_str's
	test_raiseMemError)."

	| fixture |
	importlib @env1:modules removeKey: #'str_sizeof' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_sizeof.py')
		name: 'str_sizeof'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
