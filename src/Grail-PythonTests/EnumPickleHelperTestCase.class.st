Class {
	#name : 'EnumPickleHelperTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumPickleHelperTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumPickleHelperTestCase >> setUp [
	"Reload tests/python/enum_pickle_helpers.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_pickle_helpers' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_pickle_helpers.py')
		name: 'enum_pickle_helpers'.

]

{ #category : 'Grail-Tests - _make_class_unpicklable' }
EnumPickleHelperTestCase >> testClassSyntaxEnumBecomesUnpicklable [
	"Both halves: the MEMBER raises TypeError from the installed __reduce_ex__,
	the CLASS raises PicklingError because __module__ no longer resolves."

	self assert: (self resultAt: 'cs_module') asString equals: '<unknown>'.
	self assert: (self resultAt: 'cs_member') asString
		equals: 'TypeError: <ClassSyntax.dill: 1> cannot be pickled'.
	self assert: (self resultAt: 'cs_class') asString equals: 'PicklingError'.

]

{ #category : 'Grail-Tests - _make_class_unpicklable' }
EnumPickleHelperTestCase >> testFunctionalEnumBecomesUnpicklable [
	"The shape test_pickle_explodes actually uses.  This one needed the
	functional-API class to have a class-attribute store at all -- without it
	_make_class_unpicklable could install NEITHER of the two things it sets."

	self assert: (self resultAt: 'fn_module') asString equals: '<unknown>'.
	self assert: (self resultAt: 'fn_member') asString
		equals: 'TypeError: <BadPickle.dill: 1> cannot be pickled'.
	self assert: (self resultAt: 'fn_class') asString equals: 'PicklingError'.

]

{ #category : 'Grail-Tests - A functional enum is an ordinary class' }
EnumPickleHelperTestCase >> testModuleKeywordIsHonoured [
	"``Enum('BadPickle', ..., module=__name__)'' -- accepted and ignored before,
	and it is the name pickle resolves a class BY."

	self assert: (self resultAt: 'fn_module_from_kwarg').

]

{ #category : 'Grail-Tests - Ordinary pickling untouched' }
EnumPickleHelperTestCase >> testNormalEnumsStillRoundTrip [
	"A member survives dumps/loads as the same object, and so does a class."

	self assert: (self resultAt: 'roundtrip').
	self assert: (self resultAt: 'roundtrip_class').

]

{ #category : 'Grail-Tests - pickle propagates a raising __reduce_ex__' }
EnumPickleHelperTestCase >> testRaisingReduceExIsNotSwallowed [
	"Not enum-specific: raising from __reduce_ex__ is how ANY object declares
	itself unpicklable, and pickle read every exception as ``no reduce''."

	self assert: (self resultAt: 'stubborn') asString
		equals: 'TypeError: no thank you'.

]

{ #category : 'Grail-Tests - _reduce_ex_by_global_name' }
EnumPickleHelperTestCase >> testReduceExByGlobalNameAnswersTheMemberName [
	"``Cls.__reduce_ex__ = enum._reduce_ex_by_global_name'' then
	``Cls.TWO.__reduce_ex__(proto)'' -- so the helper has to BIND the member as
	self, which a module-level BoundMethod would not."

	self assert: (self resultAt: 'by_name') asString equals: 'TWO'.
	self assert: (self resultAt: 'by_name_protos') asString equals: 'ONE,ONE,ONE'.

]

{ #category : 'Grail-Tests - A functional enum is an ordinary class' }
EnumPickleHelperTestCase >> testSetattrOnAFunctionalEnumWorks [
	"Every class-attribute store raised AttributeError; the members must be
	untouched by giving the class one."

	self assert: (self resultAt: 'fn_setattr') asString equals: 'stuck'.
	self assert: (self resultAt: 'fn_members_intact') asString equals: 'a,b'.

]
