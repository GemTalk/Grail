! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyNamespaceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyNamespaceTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyNamespaceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyNamespaceTestCase
!
! PEP 3115's ``__prepare__'' -- the mapping a class body is executed in:
!
!     class Meta(type):
!         @classmethod
!         def __prepare__(metacls, cls, bases, **kwds):
!             return EnumDict(cls)
!
! CPython asks the metaclass for a namespace BEFORE running the body, runs the
! body against it, and hands it to the metaclass afterwards.  A namespace that
! watches the writes can then refuse one, which is the whole point of
! enum.EnumDict.
!
! Grail had no class-body namespace at all: a body compiles to accessor stores on
! the class.  This is the FIRST STAGE of giving it one, and what it covers versus
! what it does not is the shape of the remaining work, so both are pinned here.
!
! COVERED: every class-body ASSIGNMENT, at body level and inside a compound
! statement (``with'' / ``if'' / loops), in source order.  Routed at two places
! -- the attribute-value emit in ClassDefAst, and object >>
! ___classBodyDefinitionalStore___:put:, which both the single and the chained
! runtime store already funnel through.
!
! NOT COVERED: ``def'' and nested ``class'' bindings, ``vars()'' inside a body,
! and an INHERITED metaclass.  See docs/Class_Body_Namespace.md.
!
! Drives tests/python/class_body_namespace.py.  test_enum
! TestEnumDict.test_enum_dict_in_metaclass.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyNamespaceTestCase removeAllMethods.
ClassBodyNamespaceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyNamespaceTestCase
setUp
	"Reload tests/python/class_body_namespace.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_namespace' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_namespace.py')
		name: 'class_body_namespace'.
%

category: 'Grail-Private'
method: ClassBodyNamespaceTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The namespace sees the body'
method: ClassBodyNamespaceTestCase
testEveryAssignmentIsOfferedInSourceOrder
	"Body-level, inside a ``with'', and inside an ``if'' -- plus __doc__, which
	CPython also puts in the namespace."

	self assert: (self resultAt: 'seen') asString
		equals: '[''__doc__'', ''plain'', ''handle'', ''in_with'', ''in_if'']'.
%

category: 'Grail-Tests - The namespace sees the body'
method: ClassBodyNamespaceTestCase
testTheValuesStillReachTheClass
	"The namespace is a route, not a replacement: every value still lands on the
	class exactly as before."

	self assert: (self resultAt: 'plain') asString equals: '1'.
	self assert: (self resultAt: 'in_with') asString equals: '2'.
	self assert: (self resultAt: 'in_if') asString equals: '3'.
%

category: 'Grail-Tests - Refusing a write'
method: ClassBodyNamespaceTestCase
testANamespaceCanRefuseADuplicate
	"What the whole path exists to make reachable.  enum.EnumDict refuses a
	reused member name, and the refusal raises out of the class statement."

	self assert: (self resultAt: 'duplicate') asString equals: '''a'' already defined as 1'.
%

category: 'Grail-Tests - Refusing a write'
method: ClassBodyNamespaceTestCase
testTheRefusalReachesACompoundStatement
	"test_enum puts the duplicate inside a ``with'' block, not at body level, so
	routing only the body-level assignments would have looked right and closed
	nothing.  Both funnel through ___classBodyDefinitionalStore___:put:."

	self assert: (self resultAt: 'duplicate_in_with') asString
		equals: '''a'' already defined as 1'.
%

category: 'Grail-Tests - Refusing a write'
method: ClassBodyNamespaceTestCase
testAReservedSunderIsTheOtherComplaint
	self assert: (self resultAt: 'sunder') asString
		equals: '_sunder_ names, such as ''_a_sunder_'', are reserved for future Enum use'.
%

category: 'Grail-Tests - EnumDict construction'
method: ClassBodyNamespaceTestCase
testEnumDictTakesAClassName
	"CPython's EnumDict records the class name so a mangled private name can be
	told from a reserved sunder.  The inherited dict constructor reads a
	positional argument as the mapping to build FROM, so ``EnumDict('Colour')''
	raised -- which is exactly what a __prepare__ returning EnumDict(cls) hit,
	and it hit it silently until the guard swallowing it was removed."

	self assert: (self resultAt: 'enumdict_named') asString equals: 'EnumDict:1'.
	self assert: (self resultAt: 'enumdict_bare') asString equals: 'EnumDict'.
%

category: 'Grail-Tests - Classes without a metaclass'
method: ClassBodyNamespaceTestCase
testAnOrdinaryClassEmitsWhatItAlwaysDid
	"The change is confined to class statements that NAME a metaclass, which is
	what keeps a corpus-wide codegen change to zero regressions.  Both
	assignments still run, in order, and the last still wins."

	self assert: (self resultAt: 'ordinary_calls') asString equals: '[''first'', ''second'']'.
	self assert: (self resultAt: 'ordinary_value') asString equals: '''second'''.
%

category: 'Grail-Tests - Enums get one too'
method: ClassBodyNamespaceTestCase
testAnEnumBodyRunsInANamespaceWithoutNamingAMetaclass
	"""Grail's enum metaclass is Smalltalk (``Enum class''), so there is no
	``metaclass='' keyword to carry it -- which is why the gate on an explicit
	keyword had to go.  The namespace comes from the metaclass chain instead.

	Members, autos and aliases are all unaffected: the namespace is a route,
	not a replacement."""

	self assert: (self resultAt: 'enum_members') asString equals: '[''RED'', ''GREEN'']'.
	self assert: (self resultAt: 'enum_autos') asString equals: '1,2'.
	self assert: (self resultAt: 'enum_alias') asString equals: 'True'.
%

category: 'Grail-Tests - Enums get one too'
method: ClassBodyNamespaceTestCase
testAReusedMemberNameIsRefusedWhereItIsWritten
	"""And so the value reported is the one the mapping ALREADY HOLDS.

	Grail used to name the surviving binding instead -- the metaclass hook
	noticed the clash only after the earlier store was gone -- and
	ClassBodyRebindingTestCase recorded that as a deviation.  CPython's own test
	pins the reading: test_dynamic_members_with_static_methods expects
	``'FOO_CAT' already defined as 'aloof''', the existing value."""

	self assert: (self resultAt: 'enum_duplicate') asString
		equals: '''red'' already defined as 1'.
%

category: 'Grail-Tests - Known gaps'
method: ClassBodyNamespaceTestCase
testDefsAndNestedClassesBypassItWhichIsAKnownGap
	"Recorded, NOT endorsed.  Stage 1 routes ASSIGNMENTS.  A ``def'' and a
	nested ``class'' bind a name too, and CPython's namespace sees both; here
	each has its own emission path and still bypasses it."

	self assert: (self resultAt: 'def_seen_a_known_gap') asString equals: 'False'.
	self assert: (self resultAt: 'nested_class_seen_a_known_gap') asString equals: 'False'.
%

category: 'Grail-Tests - Known gaps'
method: ClassBodyNamespaceTestCase
testVarsInABodyIsNotTheNamespaceWhichIsAKnownGap
	"Recorded, NOT endorsed.  ``vars()'' answers a plain dict, so the
	write-into-vars() idiom -- test_enum's test_ignore and
	test_dynamic_members_with_static_methods -- is not reached by this stage."

	self assert: (self resultAt: 'vars_in_body_a_known_gap') asString equals: 'dict'.
%

category: 'Grail-Tests - Known gaps'
method: ClassBodyNamespaceTestCase
testAutoIsNotResolvedAtAssignmentWhichIsAKnownGap
	"""Recorded, NOT endorsed.  ``auto()'' is still resolved in a later pass, so
	a body that USES a member it just defined sees the unresolved marker and the
	operator fails.  The read-back this needs is already in place -- the
	namespace's value is what lands on the class -- but EnumDict does not yet
	call _generate_next_value_ on the way in.  test_enum's
	test_using_members_as_nonmember is what closing this buys."""

	self assert: (self resultAt: 'auto_at_assignment_a_known_gap') asString
		equals: 'TypeError'.
%

category: 'Grail-Tests - Known gaps'
method: ClassBodyNamespaceTestCase
testAnInheritedMetaclassIsNotAskedWhichIsAKnownGap
	"Recorded, NOT endorsed.  Grail does not install a Python metaclass as the
	Smalltalk metaclass, so a subclass has nothing to ask for a namespace.  That
	is a pre-existing modelling gap rather than one this stage introduces, and
	it is what confines the change to class statements naming a metaclass."

	self assert: (self resultAt: 'inherited_metaclass_a_known_gap') asString equals: '[]'.
%
