Class {
	#name : 'EnumNamedtupleAutoTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumNamedtupleAutoTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumNamedtupleAutoTestCase >> setUp [
	"Reload tests/python/enum_namedtuple_auto.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_namedtuple_auto' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_namedtuple_auto.py')
		name: 'enum_namedtuple_auto'.

]

{ #category : 'Grail-Tests - auto() inside a namedtuple' }
EnumNamedtupleAutoTestCase >> testMarkersResolveInDeclarationOrder [
	"1, 2, 3 across the three members -- the same numbering the plain-tuple
	path produces, because it IS the same walk."

	self assert: (self resultAt: 'values') asString
		equals: 'T(index=1, desc=''for the money'');T(index=2, desc=''for the show'');T(index=3, desc=''for the music'')'.
	self assert: (self resultAt: 'third_index') equals: 3.
	self assert: (self resultAt: 'second_desc') asString equals: 'for the show'.

]

{ #category : 'Grail-Tests - Unchanged shapes' }
EnumNamedtupleAutoTestCase >> testNamedtupleMixinStillBuilds [
	"``class NTCEnum(TT, Enum)'' -- the namedtuple as the DATA TYPE rather than
	as the value."

	self assert: (self resultAt: 'mixin_repr') asString
		equals: '<NTCEnum.NONE: TT(id=0, a=0, blist=[])>'.
	self assert: (self resultAt: 'mixin_field') equals: 1.

]

{ #category : 'Grail-Tests - Unchanged shapes' }
EnumNamedtupleAutoTestCase >> testNamedtupleWithoutAutoIsUntouched [
	"No markers, no unwrap -- the value passes through as written."

	self assert: (self resultAt: 'plain_nt') asString
		equals: 'TT(id=0, a=0, blist=[]);TT(id=1, a=2, blist=[4])'.

]

{ #category : 'Grail-Tests - Unchanged shapes' }
EnumNamedtupleAutoTestCase >> testPlainTupleAndBareAutoUnchanged [
	"The two paths that already worked, pinned so the normalise/restore cannot
	disturb them."

	self assert: (self resultAt: 'plain_tuple') asString
		equals: '(1, ''a'');(2, ''b'')'.
	self assert: (self resultAt: 'bare') asString equals: 'x=1,y=2'.

]

{ #category : 'Grail-Tests - auto() inside a namedtuple' }
EnumNamedtupleAutoTestCase >> testValueIsRebuiltAsTheNamedtuple [
	"Unwrapping to a plain tuple must not leave it one: the value is still a T,
	and still compares equal to the plain tuple."

	self assert: (self resultAt: 'is_namedtuple').
	self assert: (self resultAt: 'equals_tuple').

]
