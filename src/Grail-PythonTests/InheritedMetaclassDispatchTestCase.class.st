Class {
	#name : 'InheritedMetaclassDispatchTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
InheritedMetaclassDispatchTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
InheritedMetaclassDispatchTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inherited_metaclass_dispatch' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/inherited_metaclass_dispatch.py')
		name: 'inherited_metaclass_dispatch'.

]

{ #category : 'Grail-Tests - The guard' }
InheritedMetaclassDispatchTestCase >> testABCMetaNamedDirectlyStillEnforces [
	"``metaclass=ABCMeta'' written out is the spelling that DOES enforce
	abstractness in Grail, and it must keep doing so -- it is the other half of
	the recorded gap below, and the two spellings must not silently converge."

	self assert: (self resultAt: 'abc_keyword_refuses') asString equals: 'TypeError'.
	self assert: (self resultAt: 'abc_concrete_works') asString equals: '''f'''.

]

{ #category : 'Grail-Tests - The guard' }
InheritedMetaclassDispatchTestCase >> testAMetaclassThatDoesNotConstructIsLeftAlone [
	"___grailMetaclassConstructs___: is what stops this firing across the whole
	corpus.  A metaclass overriding neither __new__ nor __init__ is not
	dispatched and gets no namespace -- which is the ABCMeta case, and ABCMeta
	is everywhere."

	self assert: (self resultAt: 'quiet_types') asString
		equals: '[''Quiet'', ''Quiet'']'.

]

{ #category : 'Grail-Tests - Inherited metaclass' }
InheritedMetaclassDispatchTestCase >> testAnEnumMetaclassInjectingMembersNowGetsThem [
	"CLOSED, and recorded here because this test used to assert the gap.

	test_enum test_extra_member_creation: the metaclass adds ``<NAME>_DESC''
	entries to the classdict, and CPython makes them members because
	EnumType.__new__ -- the builder -- runs INSIDE the ``super().__new__'' the
	metaclass delegates to.  Grail built members from its own
	___pyClassDefined___: hook, which fires BEFORE any Python metaclass, so the
	injected names arrived after the enum was final and this answered the two
	declared names.  The build is now deferred to type >> __new__:_:_:_:, the
	same point CPython builds at; see EnumMetaclassExtraMembersTestCase."

	self assert: (self resultAt: 'enum_metaclass_members') asString
		equals: '[''ID'', ''NAME'', ''ID_DESC'', ''NAME_DESC'']'.

]

{ #category : 'Grail-Tests - Known gaps' }
InheritedMetaclassDispatchTestCase >> testAnEnumMetaclassStillHasTheWrongMroWhichIsAKnownGap [
	"STILL A GAP, and independent of the members above.  ``class
	IDEnumMeta(EnumMeta)'' does not inherit EnumMeta: Grail's EnumMeta IS the
	Smalltalk metaclass ``Enum class'', and object >> ___subclass___: degrades a
	metaclass base to a subclass of ``type'' so the class statement succeeds.
	Its mro is therefore ('IDEnumMeta', 'type', 'object') where CPython has
	('IDEnumMeta', 'EnumType', 'type', 'object') -- EnumType is what is missing
	now.  It used to name Grail's PythonInstance between type and object as
	well; hiding the implementation root from the Python-visible mro removed
	that half.

	The members work anyway because the DISPATCH reaches the metaclass -- the
	mro is what an ``isinstance(x, EnumType)'' or a super() walk through
	EnumType would need, and nothing in test_enum asks."

	self assert: (self resultAt: 'enum_metaclass_mro') asString
		equals: '[''IDEnumMeta'', ''type'', ''object'']'.

]

{ #category : 'Grail-Tests - Dispatch' }
InheritedMetaclassDispatchTestCase >> testASubclassGetsItsOwnFreshObject [
	"The case inheritance CANNOT fake: the metaclass gives each class a NEW
	list.  If it never ran for Sub, Sub.registry simply IS Base.registry, reached
	by inheritance -- so the test is identity, and both lists stay empty.

	Asserted by identity rather than by mutating one and reading the other,
	because the mutating form is NOT idempotent: it appends on every module load,
	and a canonical class is REUSED across loads without re-running its class
	statement -- so the metaclass does not run again either.  That read [[],
	['x']] standalone and [[], ['x', 'x', 'x', 'x']] in the sharded suite."

	self assert: (self resultAt: 'registries_are_distinct') asString
		equals: '[True, True, True]'.

]

{ #category : 'Grail-Tests - Dispatch' }
InheritedMetaclassDispatchTestCase >> testEachSubclassIsStampedWithItsOwnName [
	"The stamp a metaclass writes is per-CLASS.  B used to read A's tag through
	ordinary inheritance, which is the right answer for the wrong reason -- so
	the name has to differ per class for the test to mean anything."

	self assert: (self resultAt: 'tags') asString
		equals: '[''seen-A'', ''seen-B'', ''seen-C'']'.
	self assert: (self resultAt: 'types') asString equals: '[''M'', ''M'', ''M'']'.

]

{ #category : 'Grail-Tests - Known gaps' }
InheritedMetaclassDispatchTestCase >> testInheritingAbcABCEnforcesAbstractness [
	"``class Abstract(abc.ABC)'' with an unimplemented abstract method refuses
	instantiation, and type(Abstract) is ABCMeta -- CPython's answers.  This
	test used to guard the opposite as a known, deliberate gap: abc.py wrote
	``class ABC:'' with no metaclass, so nothing was inherited and nothing was
	refused.  abc.py is CPython's own now."

	self assert: (self resultAt: 'abc_base_refuses') asString equals: 'TypeError'.
	self assert: (self resultAt: 'abc_base_type') asString equals: '''ABCMeta'''.

]

{ #category : 'Grail-Tests - Dispatch' }
InheritedMetaclassDispatchTestCase >> testTheMetaclassRunsForEveryClassInTheChain [
	"__new__ AND __init__, for A, B and C, in that order.  Two levels below the
	class that named the metaclass, because one level can be reached by a
	special case and two cannot."

	self assert: (self resultAt: 'log') asString
		equals: '[''new:A'', ''init:A'', ''new:B'', ''init:B'', ''new:C'', ''init:C'']'.

]
