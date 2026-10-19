Class {
	#name : 'EnumDefinitionErrorsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumDefinitionErrorsTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumDefinitionErrorsTestCase >> setUp [
	"Reload tests/python/enum_definition_errors.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_definition_errors' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_definition_errors.py')
		name: 'enum_definition_errors'.

]

{ #category : 'Grail-Tests - _value_ not set in __new__' }
EnumDefinitionErrorsTestCase >> testConstructibleMixinValueStillBuilds [
	"Guard rail: making the __new__ path strict must not turn a member_type
	that CAN take the args into an error."

	self assert: (self resultAt: 'constructible') asString
		equals: 'june=''1'',july=''2'''.

]

{ #category : 'Grail-Tests - _value_ not set in __new__' }
EnumDefinitionErrorsTestCase >> testEncodedStrArgsNowBuild [
	"""Was a recorded gap, and it did its job: the assertion was written so that
	the day the (bytes, encoding) form was supported this test would FAIL and be
	updated, rather than the gap going unnoticed.  That day is this one.

	CPython builds ``three = b'3', 'ascii''' as str(b'3', 'ascii') == '3'.
	Grail's str handle is a one-argument BoundMethod, so the coercion could not
	make the call at all, and the path being best-effort meant the raw tuple
	survived as the member's value.  StrDecodeArgsTestCase pins the whole shape,
	including the argument validation and the tuple that is NOT a decode."""

	self assert: (self resultAt: 'encoded_gap') asString equals: '''3'''.

]

{ #category : 'Grail-Tests - _generate_next_value_ ordering' }
EnumDefinitionErrorsTestCase >> testGeneratorAfterMembersIsAnError [
	"CPython _EnumDict.__setitem__ (test_auto_order)."

	self assert: (self resultAt: 'gnv_after') asString
		equals: 'TypeError: _generate_next_value_ must be defined before members'.

]

{ #category : 'Grail-Tests - _generate_next_value_ ordering' }
EnumDefinitionErrorsTestCase >> testGeneratorBeforeMembersIsFine [
	"The ordinary, legal spelling -- and the values still come from it."

	self assert: (self resultAt: 'gnv_first') asString
		equals: 'red=red,green=green'.

]

{ #category : 'Grail-Tests - _value_ not set in __new__' }
EnumDefinitionErrorsTestCase >> testNewThatLeavesValueUnsetIsAnError [
	"test_missing_value_error: __new__ sets the str content and its own slots
	but never _value_, and str cannot be built from ('An$(1,2)', 0)."

	self assert: (self resultAt: 'no_value') asString
		equals: 'TypeError: _value_ not set in __new__, unable to create it'.

]

{ #category : 'Grail-Tests - _value_ not set in __new__' }
EnumDefinitionErrorsTestCase >> testNewThatSetsValueIsFine [
	self assert: (self resultAt: 'value_set') asString equals: 'ay/1/Fine.a'.

]

{ #category : 'Grail-Tests - _generate_next_value_ ordering' }
EnumDefinitionErrorsTestCase >> testPlainAutoNumberingUnaffected [
	"No generator at all."

	self assert: (self resultAt: 'no_gnv') asString equals: 'a=1,b=2'.

]

{ #category : 'Grail-Tests - _generate_next_value_ ordering' }
EnumDefinitionErrorsTestCase >> testPresetAutoDoesNotConstrainTheGenerator [
	"test_auto_order_wierd: an auto() whose value was set OUTSIDE the body never
	calls the generator, so it does not pin where the generator may appear.
	Guard rail -- the naive ``any auto() before the def'' rule breaks this."

	self assert: (self resultAt: 'gnv_preset') asString
		equals: 'red=pathological case,blue=blue'.

]
