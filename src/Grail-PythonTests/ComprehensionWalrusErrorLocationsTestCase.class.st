Class {
	#name : 'ComprehensionWalrusErrorLocationsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ComprehensionWalrusErrorLocationsTestCase >> testWalrusErrorsAreLocatedOnTheirNodes [
	"tests/python/comprehension_walrus_error_locations.py: a comprehension's
	three assignment-expression errors are placed over the walrus in an
	iterable, the walrus target rebinding an iteration variable, and the inner
	loop target rebinding a walrus target.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'comprehension_walrus_error_locations' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/comprehension_walrus_error_locations.py')
		name: 'comprehension_walrus_error_locations'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
