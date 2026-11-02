Class {
	#name : 'DictDisplaySplatNeedsAMappingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DictDisplaySplatNeedsAMappingTestCase >> testADictDisplaySplatTakesAMappingAndRefusesAnythingElse [
	"tests/python/dict_display_splat_needs_a_mapping.py: ``{**m}'' merges a
	dict or anything with keys(), in order, and refuses an int, a list, a str
	and None as not a mapping.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'dict_display_splat_needs_a_mapping' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_display_splat_needs_a_mapping.py')
		name: 'dict_display_splat_needs_a_mapping'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
