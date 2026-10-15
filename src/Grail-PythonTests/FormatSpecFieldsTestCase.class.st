"Replacement fields inside a format spec, and the '0' flag on a str.

str.format passed ``^{}' to __format__ unexpanded, which refused it; the
nested fields now expand after the field's value, sharing its auto
numbering (CharacterCollection >> ___renderFormatField___:...).  A
'0' before a str's width defaulted the alignment to '=' as for a number,
so format('X', '0') raised; it is now a '0' fill, left-aligned, as
CPython 3.10+.  Both are reached by string.Formatter's own tests.

Every expectation in tests/python/format_spec_fields.py was produced by
CPython 3.14; the fixture gate re-checks it there."
Class {
	#name : 'FormatSpecFieldsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
FormatSpecFieldsTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Helpers' }
FormatSpecFieldsTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
FormatSpecFieldsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'format_spec_fields' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/format_spec_fields.py')
		name: 'format_spec_fields'.

]

{ #category : 'Grail-Tests' }
FormatSpecFieldsTestCase >> testNestedSpecFields [
	self assertAll: #('nested_spec_fields' 'nested_spec_errors')

]

{ #category : 'Grail-Tests' }
FormatSpecFieldsTestCase >> testZeroFlagOnAStr [
	self assertAll: #('zero_flag_on_a_str')

]
