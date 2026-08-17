! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuperTwoArgCheckTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SuperTwoArgCheckTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperTwoArgCheckTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperTwoArgCheckTestCase
!
! ``super(type, obj)'' MUST CHECK THAT obj BELONGS TO type.
!
! CPython's supercheck: obj is an instance of type, or a SUBCLASS of it when obj
! is itself a type.  Otherwise TypeError, and the message says which of the two
! readings failed -- the half that tells you what you actually passed:
!
!     super(type, obj): obj (instance of C) is not an instance or subtype of
!     type (int).
!
! Grail applied it in the runtime constructor only, never on the COMPILED path,
! so ``super(type_, obj)'' written in source built a proxy that walked the wrong
! chain.  The failure then surfaced later and elsewhere -- as ``'super' object
! has no attribute 'method''' from the eventual lookup, which displaces the
! TypeError entirely (test_super's test_supercheck_fail).
!
! WHY IT HAD BEEN LEFT OFF, AND THE BUG THAT WAS REALLY BEHIND IT.  cls:obj:
! carried a comment saying the check could not be applied there because it
! rejected cooperative mixins -- four Django failures, measured.  That was a true
! observation of a false cause.  ___isInstanceOrSubtype___ consults the MRO
! before the Smalltalk chain, and its MRO send was written BARE in a section
! compiled under ``set compile_env: 1'' while ___mroOf___: is an env-0
! classmethod.  So the send could never arrive; the on:do: wrapped around it
! swallowed the doesNotUnderstand and answered nil; and the check silently
! degraded to CHAIN-ONLY.  A cooperative mixin is not a Smalltalk superclass of
! the classes that use it, so chain-only rejects exactly the calls the comment
! describes.  The MRO branch had never once run.
!
! Two things follow, and the order matters:
!
!   * The MRO send is now @env0:, so the branch runs.  ``super(Base, Derived)''
!     for ``class Derived(Mixin, Base)'' is accepted -- Base IS on Derived's
!     linearization though ``Derived inheritsFrom: Base'' is false.
!   * The check answers true if EITHER the MRO or the chain accepts, so it can
!     only ever accept more than the (broken) old behaviour, never less.  That is
!     what makes it safe to reach from compiled code at all.
!
! THE SPLIT.  A zero-arg ``super()'' still compiles to the UNCHECKED cls:obj:,
! because codegen builds that pair from the lexical class and the method's own
! first argument -- well-formed by construction, and the hottest super path there
! is.  An explicit ``super(a, b)'', whose halves are arbitrary expressions the
! program chose, compiles to checkedCls:obj:.  The check belongs where the
! program supplies the operands, not where the compiler does.
!
! The message also had to stop leaking SMALLTALK type names: it said ``Integer''
! and ``OrderedCollection'' where CPython says ``int'' and ``list'', so the test
! matched the structure and failed on the nouns.
!
! Measured: test_super 11 -> 10 failing (test_supercheck_fail).  SUnit
! 4759/4759 -- including DjangoTestCase's 4 tests, which are the four that the
! earlier attempt broke.  No regression across the corpus.  Every expectation
! below is CPython 3.14.6's own output for tests/python/super_two_arg_check.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SuperTwoArgCheckTestCase removeAllMethods.
SuperTwoArgCheckTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SuperTwoArgCheckTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'super_two_arg_check' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/super_two_arg_check.py')
		name: 'super_two_arg_check'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: SuperTwoArgCheckTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the three rejections ---

category: 'Grail-Tests - Rejections'
method: SuperTwoArgCheckTestCase
testAnUnrelatedTypeIsRejected
	"``super(int, <C instance>)''.  The TypeError must come from the
	CONSTRUCTOR: before, a proxy was built and the failure surfaced from the
	later lookup as ``'super' object has no attribute 'method''', which is a
	diagnosis of the wrong thing entirely."

	self assert: (self at: 'reject_unrelated_type') @env0:asString
		equals: 'super(type, obj): obj (instance of C) is not an instance or subtype of type (int).'.
%

category: 'Grail-Tests - Rejections'
method: SuperTwoArgCheckTestCase
testAnUnrelatedInstanceIsRejected
	"``super(C, list())''.  Also pins the PYTHON type name: the message said
	``OrderedCollection'' while CPython says ``list'', so it matched
	structurally and failed on the noun."

	self assert: (self at: 'reject_unrelated_instance') @env0:asString
		equals: 'super(type, obj): obj (instance of list) is not an instance or subtype of type (C).'.
%

category: 'Grail-Tests - Rejections'
method: SuperTwoArgCheckTestCase
testATypePassedAsObjIsRejectedAndNamedAsAType
	"``super(C, list)''.  CPython distinguishes the two readings in the wording
	-- ``type list'' rather than ``instance of list'' -- because that is what
	says whether you passed the wrong object or the wrong class."

	self assert: (self at: 'reject_type_as_obj') @env0:asString
		equals: 'super(type, obj): obj (type list) is not an instance or subtype of type (C).'.
%

! --- what the check must NOT reject ---

category: 'Grail-Tests - Acceptances'
method: SuperTwoArgCheckTestCase
testACooperativeMixinChainStillResolves
	"THE case that made this impossible before.  ``class Derived(Mixin, Base)''
	reaches Base through the C3 linearization, and Mixin is not a Smalltalk
	superclass of Derived -- so a chain-only check rejects ``super(Mixin, self)'',
	the most common legitimate two-argument call there is.  That is what the four
	Django failures were, and the cause was a bare env-1 send to an env-0
	___mroOf___: whose DNU an on:do: was swallowing."

	self assert: (self at: 'cooperative_mixin_chain') @env0:asString
		equals: 'Derived+Mixin+Base'.
%

category: 'Grail-Tests - Acceptances'
method: SuperTwoArgCheckTestCase
testASubclassPassedAsObjIsAccepted
	"The ``or subtype'' half: ``super(Base, Derived)'' is legitimate.  Base is on
	Derived's linearization even though ``Derived inheritsFrom: Base'' is false,
	so this passes only because the MRO branch now actually runs."

	self assert: (self at: 'subclass_as_obj_ok') @env0:asString
		equals: 'constructed'.
%

category: 'Grail-Tests - Acceptances'
method: SuperTwoArgCheckTestCase
testArgumentOneMustStillBeATypeFirst
	"The argument-1 diagnosis outranks the obj check.  Order matters: testing obj
	against a non-class first walks ``inheritsFrom: 1'' and dies in the kernel
	with an uncatchable ArgumentTypeError, which is how ``super(1, int)''
	presented."

	self assert: (self at: 'arg1_not_a_type') @env0:asString equals: 'TypeError'.
%
