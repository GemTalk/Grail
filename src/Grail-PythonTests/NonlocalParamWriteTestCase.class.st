Class {
	#name : 'NonlocalParamWriteTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NonlocalParamWriteTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
NonlocalParamWriteTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
NonlocalParamWriteTestCase >> setUp [
	probe := self ___loadProbe___: 'nonlocal_write_to_enclosing_param'.

]

{ #category : 'Grail-Tests' }
NonlocalParamWriteTestCase >> testAClassBodyWritesTheEnclosingParameter [
	"test_scope's testNonLocalClass construct with the owning def at MODULE
	level -- the spelling that makes the parameter a method argument rather
	than a block temp, and the reason the upstream test passes while this
	failed."

	self assert: (self at: 'via_class_body') equals: 1.
	self assert: (self at: 'class_gets_no_attribute').

]

{ #category : 'Grail-Tests' }
NonlocalParamWriteTestCase >> testANestedDefWritesTheEnclosingParameter [
	"The headline shape.  Nothing in the def's own body writes ``x'', so before
	this fix no temp was allocated for it and the nested write compiled against
	the method argument."

	self assert: (self at: 'via_nested_def') equals: 1.

]

{ #category : 'Grail-Tests' }
NonlocalParamWriteTestCase >> testAPlainAssignmentCountsToo [
	"``x = 99'', not ``x += 1''.  The augmented form also READS the name, so on
	its own it cannot distinguish a missing temp from a missing read."

	self assert: (self at: 'plain_assignment') equals: 99.

]

{ #category : 'Grail-Tests' }
NonlocalParamWriteTestCase >> testTheShapesThatAlreadyWorkedStillDo [
	"A parameter its own def also writes already had a temp, and a nested
	``del'' was already covered by deletedNamesInSubtree.  Both share the
	assignedNames computation this fix extends, so both are pinned here rather
	than left to a later reader to assume."

	self assert: (self at: 'also_written_directly') equals: 2.
	self assert: (self at: 'nested_del') equals: 'unbound'.

]

{ #category : 'Grail-Tests' }
NonlocalParamWriteTestCase >> testTwoLevelsDownAndAnUndeclaredSibling [
	"The collector descends through intermediate scopes, and its deliberate
	over-approximation does not change an answer: ``y'' is never declared
	nonlocal and comes back untouched."

	self
		assert: (((self at: 'two_levels') @env1:__repr__) @env0:asString)
		equals: '(11, ''untouched'')'.

]
