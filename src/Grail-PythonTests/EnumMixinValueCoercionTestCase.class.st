Class {
	#name : 'EnumMixinValueCoercionTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumMixinValueCoercionTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumMixinValueCoercionTestCase >> setUp [
	"Reload tests/python/enum_mixin_value_coercion.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_mixin_value_coercion' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_mixin_value_coercion.py')
		name: 'enum_mixin_value_coercion'.

]

{ #category : 'Grail-Tests - Value coercion' }
EnumMixinValueCoercionTestCase >> testClassSyntaxCoercesThroughTheMixin [
	"``class E(str, Enum): june = 1'' -> _value_ '1'.  int and float keep the
	shapes their own types give."

	self assert: (self resultAt: 'strmix_values') asString equals: '''1'',''2'''.
	self assert: (self resultAt: 'intmix_value') asString equals: '1'.
	self assert: (self resultAt: 'floatmix_value') asString equals: '1.0'.
	self assert: (self resultAt: 'strmix_eq').

]

{ #category : 'Grail-Tests - Value coercion' }
EnumMixinValueCoercionTestCase >> testForeignMixinUnchanged [
	"``class E(date, Enum): d = 2023, 12, 1'' -- the long-standing foreign-mixin
	path still builds date(2023, 12, 1)."

	self assert: (self resultAt: 'foreign_mixin_value') asString
		equals: '2023-12-01'.

]

{ #category : 'Grail-Tests - Value coercion' }
EnumMixinValueCoercionTestCase >> testFunctionalBuilderAgrees [
	"The functional API coerces the same way AND gives the member its character
	content -- without the content every member was the empty string, so
	``M.june == '1''' was false however right _value_ was."

	self assert: (self resultAt: 'functional_values') asString
		equals: '''1'',''2'',''3'''.
	self assert: (self resultAt: 'functional_eq').
	self assert: (self resultAt: 'functional_name') asString equals: 'june'.

]

{ #category : 'Grail-Tests - _member_type_ identity' }
EnumMixinValueCoercionTestCase >> testMemberTypeIdentity [
	"CPython's contract is an IDENTITY one.  int and float already held it
	(Integer IS int); the string walk answered a concrete Unicode class, so the
	str case was False."

	self assert: (self resultAt: 'strmix_is_str').
	self assert: (self resultAt: 'strenum_is_str').
	self assert: (self resultAt: 'intmix_is_int').
	self assert: (self resultAt: 'floatmix_is_float').
	self assert: (self resultAt: 'plain_is_object').

]

{ #category : 'Grail-Tests - _member_type_ identity' }
EnumMixinValueCoercionTestCase >> testMemberTypeStillUsableAsAClass [
	"Answering the ``str'' handle must not cost issubclass()."

	self assert: (self resultAt: 'issubclass_still_works').

]

{ #category : 'Grail-Tests - Value coercion' }
EnumMixinValueCoercionTestCase >> testPlainMixinIsNotADataType [
	"``class _EnumSuperClass(metaclass=EnumMeta)'' then ``class
	E(_EnumSuperClass, Enum)'': the mixin has no usable __new__, so CPython
	leaves the value alone.  Coercing through it built
	``<E.A: <_EnumSuperClass object>>'' -- 24 tests across every flavour of the
	shared fixture."

	self assert: (self resultAt: 'plain_mixin_repr') asString equals: '<E.A: 1>'.

]

{ #category : 'Grail-Tests - str.__new__' }
EnumMixinValueCoercionTestCase >> testStrNewAllocates [
	"``str.__new__(cls, value)'' is the ALLOCATOR -- how a hand-written
	str-subclass __new__ forwards to its base.  It is class-side, so the str
	builtin's method probe never found it and the generic wrap turned the call
	into a CONSTRUCTION through cls: against an enum class that ran the
	by-value lookup and raised ``has no members''."

	self assert: (self resultAt: 'str_new_plain') asString equals: '''hello'''.
	self assert: (self resultAt: 'str_new_enum_class') asString equals: 'hello'.

]
