Class {
	#name : 'AKeywordSplatChecksAndCopiesItsKeysTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AKeywordSplatChecksAndCopiesItsKeysTestCase >> testAKeywordSplatRefusesANonStrKeyAndBindsFromACopy [
	"tests/python/a_keyword_splat_checks_and_copies_its_keys.py: a ``**''
	operand with an int key is ``keywords must be strings'' -- an exact dict,
	beside a named keyword or another splat, a dict subclass, a mapping, an
	OrderedDict -- str-subclass and surrogate keys bind, a key whose __eq__
	deletes from the caller's dict still binds, and the callee gets a dict of
	its own.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_keyword_splat_checks_and_copies_its_keys' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_keyword_splat_checks_and_copies_its_keys.py')
		name: 'a_keyword_splat_checks_and_copies_its_keys'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
