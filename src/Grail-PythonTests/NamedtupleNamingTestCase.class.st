Class {
	#name : 'NamedtupleNamingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NamedtupleNamingTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
NamedtupleNamingTestCase >> setUp [
	"Reload tests/python/namedtuple_naming.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'namedtuple_naming' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/namedtuple_naming.py')
		name: 'namedtuple_naming'.

]

{ #category : 'Grail-Tests - Pickling' }
NamedtupleNamingTestCase >> testANamedtupleCanBePickled [
	"What the naming is for, and what no Grail namedtuple could do before:
	pickle saves a class by looking its name back up."

	self assert: (self resultAt: 'roundtrip') asString
		equals: 'T(index=1, desc=''for the money'')'.
	self assert: (self resultAt: 'roundtrip_equal') asString equals: 'True'.
	self assert: (self resultAt: 'roundtrip_class') asString equals: 'True'.

]

{ #category : 'Grail-Tests - Module' }
NamedtupleNamingTestCase >> testAnExplicitModuleArgumentStillWins [
	"As upstream."

	self assert: (self resultAt: 'module_explicit') asString equals: 'some.where'.

]

{ #category : 'Grail-Tests - __name__ is writable' }
NamedtupleNamingTestCase >> testNameAndQualnameAreIndependent [
	"CPython leaves __qualname__ alone when __name__ is assigned, and vice
	versa; they are two slots, not one.

	The UNCHANGED qualname is the function-nested one: the fixture's namedtuple
	is built inside ``_pair'', and CPython gives such a class
	``_pair.<locals>.Pair''.  This asserted the bare ``Pair'' -- Grail's old
	one-level limit, not CPython's answer.  ``__name__'' below is genuinely the
	bare name, which is the contrast the test is about."

	self assert: (self resultAt: 'renamed_name') asString equals: 'Renamed'.
	self assert: (self resultAt: 'renamed_qualname_unchanged') asString
		equals: '_pair.<locals>.Pair'.
	self assert: (self resultAt: 'requalified_qualname') asString equals: 'Outer.Pair'.
	self assert: (self resultAt: 'requalified_name_unchanged') asString equals: 'Pair'.

]

{ #category : 'Grail-Tests - The class is named' }
NamedtupleNamingTestCase >> testReprUsesTheClassName [
	"Which lets the repr ask the CLASS rather than carry the typename on the
	instance -- so a real subclass reports its own name without a special case."

	self assert: (self resultAt: 'repr') asString
		equals: 'T(index=1, desc=''for the money'')'.
	self assert: (self resultAt: 'fields') asString equals: '(''index'', ''desc'')'.
	self assert: (self resultAt: 'subclass_repr') asString
		equals: 'Extended(index=2, desc=''for the show'')'.
	self assert: (self resultAt: 'subclass_name') asString equals: 'Extended'.

]

{ #category : 'Grail-Tests - The class is named' }
NamedtupleNamingTestCase >> testTheClassIsNamedAfterTheTypename [
	"Every namedtuple used to be called ``_NT''."

	self assert: (self resultAt: 'name') asString equals: 'T'.
	self assert: (self resultAt: 'qualname') asString equals: 'T'.

]

{ #category : 'Grail-Tests - Naming' }
NamedtupleNamingTestCase >> testTheDefaultModuleIsTheCallers [
	"CPython defaults __module__ to the module the factory was CALLED from
	(sys._getframemodulename(1), else the caller frame's globals); Grail now
	reads the caller's frame too.  It answered None, a recorded gap."

	self assert: (self resultAt: 'module_default') asString equals: '''namedtuple_naming'''.
	self assert: (self resultAt: 'module_is_the_callers') asString equals: 'True'.

]

