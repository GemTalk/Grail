Class {
	#name : 'AttrAccessorsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'registrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AttrAccessorsTestCase >> assertAllChecksPassIn: aModule [
	"``failures'' is the fixture's own import-time run of every check: the
	names that did not answer True, comma-joined, empty when all passed."

	self assert: (aModule @env1:___pyAttrLoad___: #check_count) equals: 25.
	self assert: (aModule @env1:___pyAttrLoad___: #failures) asString equals: ''.

]

{ #category : 'Grail-Private' }
AttrAccessorsTestCase >> loadFixtureAccessors: accBoolean directCalls: dcBoolean slots: slotsBoolean ir: irBoolean as: aName [
	"tests/python/attr_accessors.py, freshly compiled with the four flags forced."

	(importlib @env1:modules) removeKey: aName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: aName.
	importlib ___attrAccessorsForce___: accBoolean.
	importlib ___directCallsForce___: dcBoolean.
	importlib ___inferredSlotsForce___: slotsBoolean.
	importlib ___irCodegenForce___: irBoolean.
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attr_accessors.py')
		name: aName

]

{ #category : 'Grail-Setup' }
AttrAccessorsTestCase >> setUp [
	"Snapshot the canonical-class registry: the fixture is loaded once per flag
	state under distinct module names, and a class minted under one state must
	not be identity-reused under another."

	registrySnapshot := importlib ___canonicalRegistrySnapshot___.

]

{ #category : 'Grail-Setup' }
AttrAccessorsTestCase >> tearDown [
	importlib ___attrAccessorsInvalidate___.
	importlib ___directCallsInvalidate___.
	importlib ___inferredSlotsInvalidate___.
	importlib ___irCodegenEnabledInvalidate___.
	#('attr_accessors_off' 'attr_accessors_on' 'attr_accessors_dc' 'attr_accessors_all' 'attr_accessors_ir') do: [:n |
		(importlib @env1:modules) removeKey: n asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: n].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].

]

{ #category : 'Grail-Tests - Semantics' }
AttrAccessorsTestCase >> testAllChecksPassWithAccessorsAndDirectCalls [
	"Stage 2 + 3: reads are accessor sends, calls are keyword sends, and a
	0-argument call on a module / class reached dynamically is a bare unary
	send (exclusion 6 lifted)."

	self assertAllChecksPassIn:
		(self loadFixtureAccessors: true directCalls: true slots: false ir: false as: 'attr_accessors_dc').

]

{ #category : 'Grail-Tests - Semantics' }
AttrAccessorsTestCase >> testAllChecksPassWithAccessorsOff [
	"The control: the same checks hold on the unchanged loader shape, so the
	fixture pins Python semantics rather than a dispatch shape."

	self assertAllChecksPassIn:
		(self loadFixtureAccessors: false directCalls: false slots: false ir: false as: 'attr_accessors_off').

]

{ #category : 'Grail-Tests - Semantics' }
AttrAccessorsTestCase >> testAllChecksPassWithAccessorsOn [
	"THE TEST THIS EXISTS FOR: every read-semantics check holds when attribute
	loads compile to accessor sends with DNU recovery."

	self assertAllChecksPassIn:
		(self loadFixtureAccessors: true directCalls: false slots: false ir: false as: 'attr_accessors_on').

]

{ #category : 'Grail-Tests - Semantics' }
AttrAccessorsTestCase >> testAllChecksPassWithAccessorsOnIR [
	"The IR backend emits the same accessor send; skipped where the kernel
	cannot build IR at all."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self assertAllChecksPassIn:
		(self loadFixtureAccessors: true directCalls: true slots: false ir: true as: 'attr_accessors_ir').

]

{ #category : 'Grail-Tests - Semantics' }
AttrAccessorsTestCase >> testAllChecksPassWithAllThreeFlags [
	"Stages 1 + 2 + 3: the inferred attributes are named instVars behind the
	same accessor family."

	self assertAllChecksPassIn:
		(self loadFixtureAccessors: true directCalls: true slots: true ir: false as: 'attr_accessors_all').

]

{ #category : 'Grail-Tests - Structure' }
AttrAccessorsTestCase >> testBothFlagsLiftTheZeroArgExclusion [
	"``m.zero()'' on a function local: load-then-call with direct calls alone
	(#967's exclusion 6 -- a module could sit behind the name), a bare unary
	send once reads have their own spelling."

	| dcOnly both |
	importlib ___attrAccessorsForce___: false.
	importlib ___directCallsForce___: true.
	dcOnly := (importlib smalltalkForSource: 'def f(m):
    return m.zero()') asString.
	importlib ___attrAccessorsForce___: true.
	both := (importlib smalltalkForSource: 'def f(m):
    return m.zero()') asString.
	self assert: (dcOnly includesString: '___pyAttrLoad___: #''zero''') description: dcOnly.
	self assert: (both includesString: '((m) zero)') description: both.
	self deny: (both includesString: '___pyAttrLoad___: #''zero''') description: both.

]

{ #category : 'Grail-Tests - Structure' }
AttrAccessorsTestCase >> testClassBuildCompilesReadAccessors [
	"A class built with the flag on carries an accessor per inferred attribute
	(dynamic storage: no ___slot_x___ instVar without GRAIL_INFERRED_SLOTS),
	method and class-body attribute -- and none for a dunder."

	| mod cls |
	mod := self loadFixtureAccessors: true directCalls: false slots: false ir: false as: 'attr_accessors_on'.
	cls := mod @env1:___pyAttrLoad___: #Plain.
	#(#'___pyattr_count___' #'___pyattr_count___:' #'___pyattr_foo___' #'___pyattr_zero___'
	  #'___pyattr_MAX___' #'___pyattr_Inner___' #'___pyattr_make_default___' #'___pyattr_stat0___') do: [:sel |
		self assert: (cls includesSelector: sel environmentId: 1) description: sel].
	self deny: (cls includesSelector: #'___pyattr___init_____' environmentId: 1).
	self deny: (cls allInstVarNames includes: #'___slot_count___').
	self assert: ((cls categoryOfSelector: #'___pyattr_foo___' environmentId: 1) asString) equals: 'Grail-Attr Accessors'.

]

{ #category : 'Grail-Tests - Structure' }
AttrAccessorsTestCase >> testFlagChangesTheEmittedReadShape [
	"``c.x'' on an unresolved receiver: the loader with the flag off, one unary
	accessor send with it on; a dunder read keeps the loader either way."

	| off on |
	importlib ___attrAccessorsForce___: false.
	off := (importlib smalltalkForSource: 'def f(c):
    return (c.x, c.__class__)') asString.
	importlib ___attrAccessorsForce___: true.
	on := (importlib smalltalkForSource: 'def f(c):
    return (c.x, c.__class__)') asString.
	self assert: (off includesString: '___pyAttrLoad___: #''x''') description: off.
	self deny: (off includesString: '___pyattr_x___') description: off.
	self assert: (on includesString: '(c) ___pyattr_x___') description: on.
	self deny: (on includesString: '___pyAttrLoad___: #''x''') description: on.
	self assert: (on includesString: '___pyAttrLoad___: #''__class__''') description: on.

]
