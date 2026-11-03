Class {
	#name : 'StrAndFormatBlockedByNoneTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StrAndFormatBlockedByNoneTestCase >> testANoneDunderBlocksStrAndFormat [
	"tests/python/str_and_format_blocked_by_none.py: ``__str__ = None'' makes
	str(), %s, f-strings and both format conversions raise CPython's
	not-callable TypeError instead of falling back to repr, ``__format__ =
	None'' does the same for format(), and a subclass's own def unblocks it.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'str_and_format_blocked_by_none' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_and_format_blocked_by_none.py')
		name: 'str_and_format_blocked_by_none'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
