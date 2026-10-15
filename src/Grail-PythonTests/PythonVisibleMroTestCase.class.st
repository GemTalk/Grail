"Tests that the Python-visible class chain (__mro__, mro(), __bases__,
__base__) names only classes CPython also names, and that hiding Grail's
implementation root leaves method resolution, super() and issubclass
untouched.  Drives tests/python/python_visible_mro.py."
Class {
	#name : 'PythonVisibleMroTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
PythonVisibleMroTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
PythonVisibleMroTestCase >> setUp [
	"Reload tests/python/python_visible_mro.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'python_visible_mro' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/python_visible_mro.py')
		name: 'python_visible_mro'.

]

{ #category : 'Grail-Tests - The chain as Python sees it' }
PythonVisibleMroTestCase >> testAFunctionLocalClassIsFilteredToo [
	"Nothing about the elision depends on where the class was defined."

	self assert: (self resultAt: 'local_mro') asString
		equals: '[''Local'', ''object'']'.

]

{ #category : 'Grail-Tests - The chain as Python sees it' }
PythonVisibleMroTestCase >> testAnEnumAndAMultipleInheritanceClassHaveCPythonsMro [
	"The enum is the case pydoc could not document.  The MI class matters
	separately: its linearization comes from importlib's C3 walk rather than the
	raw superclass chain, so the two derivations had to be filtered in step or
	they would disagree."

	self assert: (self resultAt: 'enum_mro') asString
		equals: '[''Color'', ''Enum'', ''object'']'.
	self assert: (self resultAt: 'mi_mro') asString
		equals: '[''MI'', ''A'', ''B'', ''object'']'.

]

{ #category : 'Grail-Tests - The chain as Python sees it' }
PythonVisibleMroTestCase >> testAPlainClassHasCPythonsMro [
	"The simplest case, and the one that shows the elision is exact rather than
	approximate: (Plain, object) is not ``close to'' CPython's answer, it IS it."

	self assert: (self resultAt: 'plain_mro') asString
		equals: '[''Plain'', ''object'']'.
	self assert: (self resultAt: 'leaf_mro') asString
		equals: '[''Leaf'', ''Mid'', ''Plain'', ''object'']'.

]

{ #category : 'Grail-Tests - The chain still works' }
PythonVisibleMroTestCase >> testHidingTheRootDoesNotUnlinkIt [
	"The distinction this whole change rests on: the class is filtered out of
	what is REPORTED, not removed from the chain that is WALKED.  Every consumer
	below reads the real Smalltalk chain, and each would break if the elision
	had been done by re-rooting instead of by filtering."

	self assert: (self resultAt: 'issubclass_object') asString equals: 'True'.
	self assert: (self resultAt: 'isinstance_object') asString equals: 'True'.
	self assert: (self resultAt: 'issubclass_through_gap') asString equals: 'True'.
	self assert: (self resultAt: 'super_still_works') asString equals: '''sub+base'''.
	self assert: (self resultAt: 'inherited_method') asString equals: 'True'.
	self assert: (self resultAt: 'enum_member_lookup') asString equals: '1'.

]

{ #category : 'Grail-Tests - The chain as Python sees it' }
PythonVisibleMroTestCase >> testTheDirectBasesNameObjectRatherThanTheImplementationRoot [
	"Its own fix, not a consequence of the mro one: inspect.getclasstree builds
	its tree purely from __bases__, so it rooted every tree at PythonInstance
	independently of how __mro__ read."

	self assert: (self resultAt: 'plain_bases') asString equals: '[''object'']'.
	self assert: (self resultAt: 'plain_base') asString equals: '''object'''.
	self assert: (self resultAt: 'enum_base_of_enum') asString equals: '''object'''.
	self assert: (self resultAt: 'leaf_bases') asString equals: '[''Mid'']'.
	self assert: (self resultAt: 'leaf_base') asString equals: '''Mid'''.
	self assert: (self resultAt: 'mi_bases') asString equals: '[''A'', ''B'']'.

]

{ #category : 'Grail-Tests - The chain as Python sees it' }
PythonVisibleMroTestCase >> testTheThreeSpellingsOfTheMroAgree [
	"__mro__, mro() and inspect.getmro are separate methods in Grail, so a fix
	applied to one of them and not the others is a real possibility."

	self assert: (self resultAt: 'mro_call_agrees') asString equals: 'True'.
	self assert: (self resultAt: 'getmro_agrees') asString equals: 'True'.

]
