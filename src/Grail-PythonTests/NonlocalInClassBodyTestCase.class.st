Class {
	#name : 'NonlocalInClassBodyTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NonlocalInClassBodyTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Private' }
NonlocalInClassBodyTestCase >> at: aKey item: anIndex [
	^ (probe @env1:__getitem__: aKey) @env1:__getitem__: anIndex

]

{ #category : 'Grail-Setup' }
NonlocalInClassBodyTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'nonlocal_in_class_body' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/nonlocal_in_class_body.py')
		name: 'nonlocal_in_class_body'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests' }
NonlocalInClassBodyTestCase >> testAGlobalDeclarationInAClassBodyIsUndisturbed [
	"``global'' in a class body is the same rule one scope further out and
	already worked.  The guard on this change: the nonlocal path must not
	disturb it."

	self assert: (self at: 'global_sibling' item: 0) equals: 13.
	self assert: (self at: 'global_sibling' item: 1) equals: false.

]

{ #category : 'Grail-Tests' }
NonlocalInClassBodyTestCase >> testAnAugmentedAssignmentReachesItToo [
	"``x += 1'' is the spelling test_scope's testNonLocalClass uses -- and it
	already worked, because its outer variable renders without the unbound
	guard.  Asserted so the two spellings are held together."

	self assert: (self at: 'augmented' item: 0) equals: 15.

]

{ #category : 'Grail-Tests' }
NonlocalInClassBodyTestCase >> testAPlainAssignmentReachesTheEnclosingLocal [
	"The shape the whole change is about.  Answered 1 before -- the write was
	dropped and nothing said so."

	self assert: (self at: 'plain' item: 0) equals: 42.

]

{ #category : 'Grail-Tests' }
NonlocalInClassBodyTestCase >> testAReadLaterInTheSameBodySeesTheWrite [
	"WAS A PINNED DIVERGENCE, now fixed -- kept as a test rather than deleted,
	because it is the shape that motivated the fix.

	The nonlocal write used to be emitted in a trailing pass, after the class
	body's other statements, so a read at a LATER source position still saw the
	pre-write value: CPython answered 'after' and Grail answered 'before'.  The
	writes are now flushed at their own source position, interleaved with the
	class attributes exactly as the global-write flush already was -- see
	ClassDefAst >> ___classBodyOrderedRuntimeStatements___.

	The ENCLOSING scope saw the write either way, which is why this was only ever
	an in-body divergence; it is asserted here beside the in-body read."

	self assert: (self at: 'read_inside_body' item: 0) @env0:asString
		equals: 'after'.
	self assert: ((self at: 'read_inside_body' item: 1) @env1:__getitem__: 0)
		@env0:asString equals: 'after'.

]

{ #category : 'Grail-Tests' }
NonlocalInClassBodyTestCase >> testItWorksFromAMethodAndThroughANestedFunction [
	"The enclosing scope can be a method's body or a function nested inside
	another -- both resolve the target the same way, and neither was reached
	before."

	self assert: (self at: 'method') equals: 42.
	self assert: (self at: 'nested' item: 0) equals: 9.
	self assert: (self at: 'nested' item: 1) equals: 9.

]

{ #category : 'Grail-Tests' }
NonlocalInClassBodyTestCase >> testNonlocalDunderClassRebindsTheClassCell [
	"WAS A PINNED DIVERGENCE, now fixed -- kept as a test rather than deleted,
	because it is the shape that motivated the fix.

	CPython gives every class body an implicit ``__class__'' cell, so
	``nonlocal __class__; __class__ = 42'' rebinds it and the enclosing method
	then reads 42.  Grail resolves ``__class__'' lexically and has no assignable
	temp for it, so the write used to be dropped; it now goes to the cell the
	class carries, and the reads in that class are compiled to consult it.  See
	NonlocalDunderClassTestCase for the full behaviour, including the sibling
	method that must see the write too."

	self assert: (self at: 'dunder_class') equals: 42.

]

{ #category : 'Grail-Tests' }
NonlocalInClassBodyTestCase >> testTheNameIsNotAlsoAClassAttribute [
	"The other half of the old bug, and the reason it was wrong in BOTH
	directions: the name was bound as a class attribute as well, so the class
	carried an attribute CPython never gives it."

	self assert: (self at: 'plain' item: 1) equals: false.
	self assert: (self at: 'augmented' item: 1) equals: false.

]
