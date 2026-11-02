Class {
	#name : 'BuiltinSignaturesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BuiltinSignaturesTestCase >> testInspectSignatureReadsABuiltinsTextAndRefusesOneWithNone [
	"tests/python/builtin_signatures.py: inspect.signature of a builtin function,
	a builtin type's method -- bound or unbound -- and a builtin type is the one
	its CPython text gives; a builtin with no text (dict, int, dir, max) is
	CPython's ValueError; a Python def or class is unchanged; and rlcompleter
	completes accordingly.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'builtin_signatures' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_signatures.py')
		name: 'builtin_signatures'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
