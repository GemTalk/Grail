Class {
	#name : 'PercentFormatMappingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
PercentFormatMappingTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
PercentFormatMappingTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #percent_format_mapping ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/percent_format_mapping.py')
		name: 'percent_format_mapping'.

]

{ #category : 'Grail-Tests' }
PercentFormatMappingTestCase >> testAMappingIsExemptFromTheLeftoverCheck [
	"``'abc' % [1]'' is 'abc': a mapping operand may go unused.  Bytes count as
	a mapping on str's side, so ``'abc' % b'x''' is 'abc' too."

	#('unused_list' 'unused_range' 'unused_bytes_on_str' 'unused_custom_mapping'
	  'bytes_unused_list' 'keyed_list')
		do: [:key | self assertMatchesCPythonAt: key].

]

{ #category : 'Grail-Tests' }
PercentFormatMappingTestCase >> testAMappingIsStillOnePositionalValue [
	"Being a mapping does not stop the operand being the single positional
	value: ``'%s' % [1, 2]'' is '[1, 2]', and ``b'%r' % {}'' is b'{}', which
	bytes formatting used to refuse."

	#('list_is_one_value' 'dict_is_one_value' 'bytes_dict_is_one_value'
	  'one_value_only')
		do: [:key | self assertMatchesCPythonAt: key].

]

{ #category : 'Grail-Tests' }
PercentFormatMappingTestCase >> testAMappingThatIsNotADictServesKeys [
	"The headline: ChainMap, mappingproxy and a class with __getitem__ serve
	%(key)s, for str and for bytes."

	#('chainmap' 'mappingproxy' 'class_with_getitem' 'bytes_class_with_getitem')
		do: [:key | self assertMatchesCPythonAt: key].

]

{ #category : 'Grail-Tests - Controls' }
PercentFormatMappingTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check would stop being
	asserted and nothing would go red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '19 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
PercentFormatMappingTestCase >> testTheOriginalCasesStillHold [
	"#1220's crash, fixed in #1284: a missing key is a catchable KeyError, and
	defaultdict supplies one."

	self assertMatchesCPythonAt: 'missing_key'.
	self assertMatchesCPythonAt: 'defaultdict'.

]

{ #category : 'Grail-Tests - Controls' }
PercentFormatMappingTestCase >> testWhatIsNotAMapping [
	"int, float, None, tuple, str, a builtin function, a module and a plain
	instance: each has some __getitem__ in Grail, and none is a mapping."

	#('not_a_mapping' 'leftovers_still_an_error' 'bytes_not_a_mapping')
		do: [:key | self assertMatchesCPythonAt: key].

]
