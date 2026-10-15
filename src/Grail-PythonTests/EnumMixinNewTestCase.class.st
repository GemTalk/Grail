Class {
	#name : 'EnumMixinNewTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumMixinNewTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumMixinNewTestCase >> setUp [
	"Reload tests/python/enum_mixin_new.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_mixin_new' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_mixin_new.py')
		name: 'enum_mixin_new'.

]

{ #category : 'Grail-Tests - Integer conversion contract' }
EnumMixinNewTestCase >> testConversionProtocolAnswersAPlainInt [
	"__index__/__int__ document themselves as always answering an integer.  Once
	_value_ could hold another wrapper they answered the wrapper -- surfacing as
	``__int__ returned non-int (type NamedInt)'' and as hex() failing with
	``does not understand #printStringRadix:''."

	self assert: (self resultAt: 'index_is_plain').
	self assert: (self resultAt: 'int_is_plain').
	self assert: (self resultAt: 'hex_works') asString equals: '0x1'.

]

{ #category : 'Grail-Tests - super().__new__ guard' }
EnumMixinNewTestCase >> testDataMixinMayCallSuperNew [
	"``class MyInt(int): __new__ -> super().__new__'' is legitimate: super()
	reaches int.__new__, never Enum.__new__.  The unrestricted guard fired on
	the enum built from it and took out test_multiple_mixin_inherited."

	self assert: (self resultAt: 'foo_isinstance').
	self assert: (self resultAt: 'foo_member_type').
	self assert: (self resultAt: 'foo_repr') asString equals: '0x1'.
	self assert: (self resultAt: 'fee_value').

]

{ #category : 'Grail-Tests - super().__new__ guard' }
EnumMixinNewTestCase >> testEnumOwnNewMayNotCallSuperNew [
	"The shape CPython does reject, still rejected (test_bad_new_super)."

	self assert: (self resultAt: 'bad_super') asString equals: 'TypeError'.

]

{ #category : 'Grail-Tests - _find_new_ clause 2' }
EnumMixinNewTestCase >> testMixinNewBuildsTheMember [
	"``class NEI(NamedInt, Enum)'': NamedInt.__new__ runs, so the member carries
	the mixin's own slots and _value_ is member_type(*args), not the raw tuple."

	self assert: (self resultAt: 'plain_named') asString
		equals: 'NamedInt(''test'', 5)'.
	self assert: (self resultAt: 'member_intname') asString equals: 'the-x'.
	self assert: (self resultAt: 'member_value_eq').
	self assert: (self resultAt: 'member_is_named').
	self assert: (self resultAt: 'new_is_enum_new').

]

{ #category : 'Grail-Tests - Unbound builtin on a subclass' }
EnumMixinNewTestCase >> testObjClass [
	"``Cls.m.__objclass__'' -- NamedInt.__str__ asks whether the slot it found
	is still object's before deciding how to render."

	self assert: (self resultAt: 'objclass_is_int').

]

{ #category : 'Grail-Tests - Integer conversion contract' }
EnumMixinNewTestCase >> testOrdinaryIntEnumUnchanged [
	"A plain ``class E(int, Enum)'' has no user mixin __new__ and must keep
	going through Grail's own storage path."

	self assert: (self resultAt: 'ordinary') asString equals: 'a=1,b=2'.

]

{ #category : 'Grail-Tests - Unbound builtin on a subclass' }
EnumMixinNewTestCase >> testUnboundIntMethodOnSubclassInstance [
	"``int.__repr__(PlainInt(5))'' answered ``aPlainInt'': the handle names
	Integer, but a Python int subclass is rooted at AbstractPyInt, so the
	non-virtual perform ran Integer's method against a non-Integer and fell
	through to Smalltalk's printString."

	self assert: (self resultAt: 'unbound_repr') asString equals: '5'.
	self assert: (self resultAt: 'unbound_str') asString equals: '5'.

]
