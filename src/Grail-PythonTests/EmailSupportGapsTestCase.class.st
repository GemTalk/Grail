"Builtin behaviours CPython's email package relies on, which test_email found
missing: io.StringIO's five newline modes, bytes / bytearray equality with a
memoryview, and a surrogate-bearing codec name refused with UnicodeEncodeError.

Every expectation in tests/python/email_support_gaps.py was produced by
CPython 3.14; the fixture gate re-checks it there."
Class {
	#name : 'EmailSupportGapsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
EmailSupportGapsTestCase >> testEveryCheckAgreesWithCPython [

	| fixture |
	importlib @env1:modules removeKey: #'email_support_gaps' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/email_support_gaps.py')
		name: 'email_support_gaps'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
