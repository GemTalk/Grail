"Tests cls.__subclasses__() and its unbound spelling type.__subclasses__(cls):
direct subclasses only, module-level and function-local classes alike, and a
multiple-inheritance class visible from its SECONDARY base.  Drives
tests/python/class_subclasses.py."
Class {
	#name : 'ClassSubclassesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassSubclassesTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ClassSubclassesTestCase >> setUp [
	"Reload tests/python/class_subclasses.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_subclasses' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_subclasses.py')
		name: 'class_subclasses'.

]

{ #category : 'Grail-Tests' }
ClassSubclassesTestCase >> testAClassNamesItsDirectSubclasses [
	"Three of them, and the third is the point: ``Local'' is defined inside a
	function, so it lives in no symbol dictionary and GemStone's own
	``subclasses'' scan could never have found it.  Before the registry this
	whole list was empty."

	self assert: (self resultAt: 'direct') asString
		equals: '[''K1'', ''K2'', ''Local'']'.
	self assert: (self resultAt: 'function_local_is_listed') asString equals: 'True'.

]

{ #category : 'Grail-Tests' }
ClassSubclassesTestCase >> testASecondaryBaseSeesTheClassToo [
	"Grail chains a multiple-inheritance class under its PRIMARY base alone, so
	M2 can only find Both through importlib's MI registry -- a different source
	from the one M1 is satisfied by.  This is the case collections.abc depends
	on: Collection declares (Sized, Iterable, Container) and is chained under
	Sized, and _compose_mro's job is finding it from Container."

	self assert: (self resultAt: 'primary_base') asString equals: '[''Both'']'.
	self assert: (self resultAt: 'secondary_base') asString equals: '[''Both'']'.

]

{ #category : 'Grail-Tests' }
ClassSubclassesTestCase >> testOnlyDIRECTSubclassesAreNamed [
	"A grandchild belongs to its own parent's list, not its grandparent's -- so
	this is not the transitive walk that would be the easy thing to write."

	self assert: (self resultAt: 'grandchild_not_direct') asString equals: 'False'.
	self assert: (self resultAt: 'grandchild_of_k1') asString equals: '[''GrandKid'']'.
	self assert: (self resultAt: 'leaf_is_empty') asString equals: '[]'.

]

{ #category : 'Grail-Tests' }
ClassSubclassesTestCase >> testReimportingTheModuleDoesNotGrowTheList [
	"The failure this registry was always going to have, and did.  Grail
	re-imports a module by re-executing its body against CANONICALLY REUSED
	classes: ``class Base'' comes back as the SAME object across loads, while a
	class defined inside a function has no canonical name and is minted fresh
	each time.  So the reused base collected a new copy of the local class on
	every load -- five loads answered
	``[K1, K2, Local, Local, Local, Local, Local]''.

	CPython never has to think about this because tp_subclasses holds WEAK
	references and superseded classes simply die.  This GemStone has no weak
	collection to borrow, so importlib drops a module's registrations when its
	body is about to re-run, and the re-run puts back everything it defines --
	including, and this is the part that is easy to miss, the classes it REUSES
	rather than creates.

	Written as an explicit reload because the per-test setUp already reloads:
	that made the whole suite depend on which test happened to run last, which
	is how the bug surfaced in the first place -- as a failure in an unrelated
	assertion."

	| before after |
	before := (self resultAt: 'direct') asString.
	self setUp.
	self setUp.
	after := (self resultAt: 'direct') asString.
	self assert: before equals: '[''K1'', ''K2'', ''Local'']'.
	self assert: after equals: before.

]

{ #category : 'Grail-Tests' }
ClassSubclassesTestCase >> testTheAnswerIsAListWithoutDuplicates [
	"A list, as CPython's is, because callers index and sort it.  The dedup
	matters because the answer is a UNION of three sources -- the dictionary
	scan, the subclass registry and the MI registry -- and a class can appear in
	more than one."

	self assert: (self resultAt: 'is_a_list') asString equals: 'True'.
	self assert: (self resultAt: 'no_duplicates') asString equals: 'True'.

]

{ #category : 'Grail-Tests' }
ClassSubclassesTestCase >> testTheUnboundSpellingTakesTheClassExplicitly [
	"``type.__subclasses__(C)'' is what pydoc calls.  It must agree with
	``C.__subclasses__()'' -- they reach the answer by different routes, the
	descriptor on ``type'' versus the method on Behavior."

	self assert: (self resultAt: 'unbound') asString
		equals: '[''K1'', ''K2'', ''Local'']'.
	self assert: (self resultAt: 'unbound_agrees') asString equals: 'True'.

]
