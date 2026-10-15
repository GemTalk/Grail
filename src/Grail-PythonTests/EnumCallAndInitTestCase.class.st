Class {
	#name : 'EnumCallAndInitTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumCallAndInitTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumCallAndInitTestCase >> setUp [
	"Reload tests/python/enum_call_and_init.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_call_and_init' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_call_and_init.py')
		name: 'enum_call_and_init'.

]

{ #category : 'Grail-Tests - Alias construction' }
EnumCallAndInitTestCase >> testAnAliasIsInitialisedToo [
	"CPython builds a THROWAWAY member for an alias and initialises that,
	deciding alias-ness only afterwards -- which is how a UniqueEnum base
	rejects ``grene = 2'' (test_no_duplicates).  Grail reused the canonical
	member and built nothing, so the alias was accepted silently; this was
	recorded here as a known gap until ___grailBuildMembers: moved the alias
	test to CPython's place, after the build."

	self assert: (self resultAt: 'alias_init') asString equals: 'ValueError'.

]

{ #category : 'Grail-Tests - Inherited __init__' }
EnumCallAndInitTestCase >> testInitFromAnEnumBaseRunsAndSeesOnlyEarlierMembers [
	"``red:'' -- the first member sees an EMPTY class, not itself.  That
	ordering is the whole reason the classic alias-rejecting base works."

	self assert: (self resultAt: 'init_order') asString
		equals: 'red:;green:red;blue:red,green'.
	self assert: (self resultAt: 'unique_ok') asString equals: 'red,green'.

]

{ #category : 'Grail-Tests - Inherited __init__' }
EnumCallAndInitTestCase >> testInitOnTheClassItselfUnchanged [
	"The classic Planet(mass, radius): a class-body __init__ already ran, and
	must keep running with the value tuple spread as positional arguments."

	self assert: (self resultAt: 'own_init') asString equals: '4.869e+24/6.0518e+06'.

]

{ #category : 'Grail-Tests - The functional API still routes' }
EnumCallAndInitTestCase >> testMemberlessClassesStillBuild [
	"A names string, a mapping, and the subclass form on a member-LESS class."

	self assert: (self resultAt: 'functional') asString equals: 'a,b,c'.
	self assert: (self resultAt: 'functional_dict') asString equals: 'p=1,q=2'.
	self assert: (self resultAt: 'functional_subclass') asString equals: 'x,y'.

]

{ #category : 'Grail-Tests - The functional API still routes' }
EnumCallAndInitTestCase >> testMultiValueLookupUnchanged [
	"Cardinal(1, 0) -- the reason the string test was narrowed rather than
	dropped in the first place."

	self assert: (self resultAt: 'multi_value').

]

{ #category : 'Grail-Tests - Inherited __init__' }
EnumCallAndInitTestCase >> testRaisingInitAbortsTheClassDefinition [
	self assert: (self resultAt: 'raising_init') asString
		equals: 'TypeError: no members here'.

]

{ #category : 'Grail-Tests - A member-bearing class is final' }
EnumCallAndInitTestCase >> testTheMessageUsesPythonRepr [
	"CPython builds it with %r.  The single-value case is the one that already
	agreed, pinned so the shared helper cannot drift."

	self assert: (self resultAt: 'single') asString
		equals: '''nope'' is not a valid Color'.

]

{ #category : 'Grail-Tests - A member-bearing class is final' }
EnumCallAndInitTestCase >> testTwoArgumentCallIsALookupNotTheFunctionalApi [
	"Both shapes: a tuple second argument, and one that reads exactly like a
	names STRING -- neither may define a new enum on a class that has members."

	self assert: (self resultAt: 'final') asString
		equals: '(''Foo'', (''pink'', ''black'')) is not a valid Color'.
	self assert: (self resultAt: 'final_names_string') asString
		equals: '(''Foo'', ''pink black'') is not a valid Color'.

]
