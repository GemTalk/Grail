Class {
	#name : 'TranslateRefusesAMappingOutOfRangeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TranslateRefusesAMappingOutOfRangeTestCase >> testAMappingOutOfRangeIsRefused [
	"tests/python/translate_refuses_a_mapping_out_of_range.py: str.translate
	refuses a mapped int outside range(0x110000) with CPython's ValueError and
	a value that is no int, None or str with its TypeError -- not an
	OutOfRange that ends the session -- and str.maketrans refuses a key as
	CPython does.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'translate_refuses_a_mapping_out_of_range' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/translate_refuses_a_mapping_out_of_range.py')
		name: 'translate_refuses_a_mapping_out_of_range'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
