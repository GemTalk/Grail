! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'InheritedMetaclassDispatchTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InheritedMetaclassDispatchTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InheritedMetaclassDispatchTestCase
!
! A metaclass runs over EVERY class it governs, not only the one that named it.
!
!     class A(metaclass=M): pass
!     class B(A): pass            # M.__new__ runs for B as well
!
! Grail INHERITED the record already -- ___grailMetaclass___ walks the
! superclass chain, which is what makes type(B) answer M -- but only the class
! that wrote the ``metaclass='' keyword ever reached the dispatch.  So M.__new__
! ran for A and never for B.
!
! WHY THIS HID.  It is invisible while a metaclass only adds behaviour for its
! classes to inherit, which is what most of them do.  It shows the moment one
! STAMPS the class it builds: ``cls.tag = 'seen-' + name'' left B reading A's
! tag through ordinary inheritance -- the RIGHT ANSWER FOR THE WRONG REASON, and
! the reason a shallow test of this passes either way.  The fixture uses a
! metaclass that gives each class a FRESH list instead, because inheritance
! cannot fake that one: Base and Sub either have distinct registries or they
! share one.
!
! THE FIX is one branch in ___grailPrepareNamespace___, which is where the
! namespace decision is taken and therefore where the metaclass has to be
! settled.  The nil-metaclass case now asks ___grailMetaclass___ for an
! inherited one and routes it through the SAME path as a named one, so it gets
! __prepare__ and the plain-dict fallback on identical terms.
!
! WHY IT COSTS THE CORPUS NOTHING.  ___grailMetaclassConstructs___: admits only
! a metaclass that overrides __new__ or __init__.  ABCMeta -- which is
! everywhere -- overrides neither, so it is not dispatched and allocates no
! namespace, exactly as before.  The full CPython suite moves no row.
!
! WHAT THIS DOES NOT CLOSE.  test_enum test_extra_member_creation needs a
! metaclass deriving from EnumMeta, and three things still stand in the way --
! see the fixture's recorded gap.  Briefly: Grail's EnumMeta IS the Smalltalk
! metaclass ``Enum class'', so ``class IDEnumMeta(EnumMeta)'' degrades to a
! plain object subclass (object >> ___subclass___:, deliberately, so the
! statement succeeds); ___grailMetaclassConstructs___: admits only a type-rooted
! metaclass; and ___pyClassDefined___ builds an enum's members BEFORE
! ___grailDispatchMetaclass___ runs, so classdict entries a metaclass adds would
! arrive after the member pass.
!
! Drives tests/python/inherited_metaclass_dispatch.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InheritedMetaclassDispatchTestCase removeAllMethods.
InheritedMetaclassDispatchTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InheritedMetaclassDispatchTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inherited_metaclass_dispatch' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/inherited_metaclass_dispatch.py')
		name: 'inherited_metaclass_dispatch'.
%

category: 'Grail-Private'
method: InheritedMetaclassDispatchTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Dispatch'
method: InheritedMetaclassDispatchTestCase
testTheMetaclassRunsForEveryClassInTheChain
	"__new__ AND __init__, for A, B and C, in that order.  Two levels below the
	class that named the metaclass, because one level can be reached by a
	special case and two cannot."

	self assert: (self resultAt: 'log') asString
		equals: '[''new:A'', ''init:A'', ''new:B'', ''init:B'', ''new:C'', ''init:C'']'.
%

category: 'Grail-Tests - Dispatch'
method: InheritedMetaclassDispatchTestCase
testEachSubclassIsStampedWithItsOwnName
	"The stamp a metaclass writes is per-CLASS.  B used to read A's tag through
	ordinary inheritance, which is the right answer for the wrong reason -- so
	the name has to differ per class for the test to mean anything."

	self assert: (self resultAt: 'tags') asString
		equals: '[''seen-A'', ''seen-B'', ''seen-C'']'.
	self assert: (self resultAt: 'types') asString equals: '[''M'', ''M'', ''M'']'.
%

category: 'Grail-Tests - Dispatch'
method: InheritedMetaclassDispatchTestCase
testASubclassGetsItsOwnFreshObject
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
%

category: 'Grail-Tests - The guard'
method: InheritedMetaclassDispatchTestCase
testAMetaclassThatDoesNotConstructIsLeftAlone
	"___grailMetaclassConstructs___: is what stops this firing across the whole
	corpus.  A metaclass overriding neither __new__ nor __init__ is not
	dispatched and gets no namespace -- which is the ABCMeta case, and ABCMeta
	is everywhere."

	self assert: (self resultAt: 'quiet_types') asString
		equals: '[''Quiet'', ''Quiet'']'.
%

category: 'Grail-Tests - The guard'
method: InheritedMetaclassDispatchTestCase
testABCMetaNamedDirectlyStillEnforces
	"``metaclass=ABCMeta'' written out is the spelling that DOES enforce
	abstractness in Grail, and it must keep doing so -- it is the other half of
	the recorded gap below, and the two spellings must not silently converge."

	self assert: (self resultAt: 'abc_keyword_refuses') asString equals: 'TypeError'.
	self assert: (self resultAt: 'abc_concrete_works') asString equals: '''f'''.
%

category: 'Grail-Tests - Known gaps'
method: InheritedMetaclassDispatchTestCase
testInheritingAbcABCDoesNotEnforceWhichIsAKnownGap
	"PRE-EXISTING and DELIBERATE, recorded here as a guard rather than a claim.
	src/python/stdlib/abc.py spells the marker ``class ABC:'' and not ``class
	ABC(metaclass=ABCMeta)'', with a comment giving the reason: routing every
	ABC subclass's isinstance/issubclass miss through ABCMeta.__instancecheck__
	is a performance and semantic change worth measuring on its own.  So there
	is no metaclass record for a subclass to inherit, and this commit -- which
	only changes what happens when there IS one -- leaves it exactly as it was.
	Verified identical before and after."

	self assert: (self resultAt: 'abc_base_refuses') asString equals: 'instantiated'.
	self assert: (self resultAt: 'abc_base_type') asString equals: '''type'''.
%

category: 'Grail-Tests - Known gaps'
method: InheritedMetaclassDispatchTestCase
testAnEnumMetaclassIsStillNotDispatchedWhichIsAKnownGap
	"test_enum test_extra_member_creation.  ``class IDEnumMeta(EnumMeta)'' does
	not inherit EnumMeta at all: Grail's EnumMeta IS the Smalltalk metaclass
	``Enum class'', and object >> ___subclass___: degrades a metaclass base to a
	plain object subclass so the class statement succeeds.  Its mro is therefore
	('IDEnumMeta', 'object') where CPython has ('IDEnumMeta', 'EnumType',
	'type', 'object'), it is not type-rooted so ___grailMetaclassConstructs___:
	rejects it, and even dispatched it would run after ___pyClassDefined___ has
	already built the members."

	self assert: (self resultAt: 'enum_metaclass_members') asString
		equals: '[''ID'', ''NAME'']'.
	self assert: (self resultAt: 'enum_metaclass_mro') asString
		equals: '[''IDEnumMeta'', ''type'', ''PythonInstance'', ''object'']'.
%
