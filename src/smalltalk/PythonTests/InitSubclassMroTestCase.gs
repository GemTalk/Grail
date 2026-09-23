! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InitSubclassMroTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InitSubclassMroTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InitSubclassMroTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InitSubclassMroTestCase
!
! PEP 487 resolved along the MRO, and the dynamic class builder that ran none of
! it.
!
! THE CHAIN HAS TWO HALVES AND BOTH WALKED THE WRONG LINKS.  The ENTRY -- which
! hook a new class starts at -- searched the bases left to right, each one's
! Smalltalk superclass chain first; the CONTINUATION -- ``super().__init_subclass__
! (**kwargs)'' inside a hook -- walked the hook owner's own superclass links.
! Both agree with the MRO for any hierarchy whose bases do not SHARE an
! ancestor, and a diamond is the shape where they do not: ``class A(Left,
! Middle, Right)'' with Left and Right both deriving from Base puts Base AFTER
! Middle, so the entry reached Base through Left and never asked Middle, and
! Middle's super() could not reach Right whatever the entry point was.  Fixing
! only one half would have moved the failure rather than closed it.
!
! Both now go through ___grailInitSubclassMroSupplierAfter___, which reads
! __mro__ and answers the next class that SUPPLIES a hook, defined or assigned.
! The continuation is narrowed to this one attribute name in Super >>
! ___pyAttrLoad___: making every super() MRO-ordered is the resolution rule for
! the whole corpus and a different change; __init_subclass__ is the case where
! the cooperative chain IS the feature.
!
! THE FIXTURE LOGS WHICH HOOK RAN, not just what the hooks left behind.  The
! class attributes CPython's own test asserts are a weaker statement than they
! look -- ``cls.calls += [x]'' MUTATES the list the class inherited, so a later
! subclass writes back into an ancestor's value and a wrong entry point can
! still leave a plausible list.  Three of this file's rows were measured wrong
! on the first pass for exactly that reason, and the order log is what makes
! them say what they mean.
!
! TWO MORE DEFECTS CAME OUT OF THE SAME TEST, both wider than it:
!
!   * ``cls.attr += v'' emitted a RAW dynamic-instVar store.  That is an
!     ImproperOperation when the receiver is a class -- and an uncatchable
!     env-0 one, so it took down the whole module run rather than raising
!     anything Python could see.  ``@classmethod def bump(cls): cls.count += 1''
!     is ordinary Python and died there.  The PLAIN assignment emitter has
!     always routed the same target shape through ``__setattr__:_:''; this was
!     the stale second copy of one rule, and routing both the same way also
!     means a @property setter now fires for an augmented assignment instead of
!     being written straight past.
!   * ``type(name, bases, ns)'' ran NEITHER half of PEP 487 -- no __set_name__,
!     no __init_subclass__ -- so a class built dynamically got nothing the
!     identical class statement gets.  It now runs both, and accepts the class
!     keywords CPython has forwarded to the hook since 3.6, which is what lets
!     types.new_class stop dropping its own.
!
! WHAT IS STILL NOT FIXED: new_class cannot honour an explicit ``metaclass=''
! that differs from the bases, because calling a metaclass to build a class
! still answers an INSTANCE of it.  The KEYWORDS reach the hook either way, so
! the check happens; the metaclass does not.  docs/Issues.md carries it.
!
! Drives tests/python/init_subclass_mro.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.
!
! test_subclassinit's test_init_subclass_diamond and test_errors.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InitSubclassMroTestCase removeAllMethods.
InitSubclassMroTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InitSubclassMroTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'init_subclass_mro' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/init_subclass_mro.py')
		name: 'init_subclass_mro'.
%

category: 'Grail-Private'
method: InitSubclassMroTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - the MRO chain'
method: InitSubclassMroTestCase
testTheDiamondRunsItsHooksInMroOrder
	"The shape where an MRO differs from a left-to-right base walk.  The
	ORDER row is the one that matters: the entry must be Middle and not Base,
	and Middle's super() must reach Right, which is in a different branch
	entirely."

	self assertMatchesCPythonAt: 'diamond_mro'.
	self assertMatchesCPythonAt: 'diamond_chain_order'.
	self assertMatchesCPythonAt: 'diamond_calls'.
%

category: 'Grail-Tests - the MRO chain'
method: InitSubclassMroTestCase
testTheTwoBaseCaseCrossesToASiblingBranch
	"Entry at a base's ANCESTOR, continuing into a base that shares no
	ancestor with it -- the hop the Smalltalk-links walk could not make."

	self assertMatchesCPythonAt: 'two_base_chain_order'.
	self assertMatchesCPythonAt: 'secondary_base_hook'.
%

category: 'Grail-Tests - the MRO chain'
method: InitSubclassMroTestCase
testTheAncestorsAreLeftAlone
	"A hook runs for the class being created and for nothing else: neither
	base's own attribute moves when A is built."

	self assertMatchesCPythonAt: 'diamond_left_untouched'.
	self assertMatchesCPythonAt: 'diamond_right_untouched'.
	self assertMatchesCPythonAt: 'own_hook_not_run_for_itself'.
%

category: 'Grail-Tests - storing from a hook'
method: InitSubclassMroTestCase
testAnAugmentedStoreWorksWhereverTheReceiverIsAClass
	"``cls.attr += v'' in a classmethod and in a hook.  Both used to die with
	an uncatchable ``dynamic instVars not supported in a Class''."

	self assertMatchesCPythonAt: 'classmethod_augmented'.
	self assertMatchesCPythonAt: 'hook_augmented'.
%

category: 'Grail-Tests - storing from a hook'
method: InitSubclassMroTestCase
testAnAugmentedStoreStillGoesThroughTheInstancePath
	"The control for the change above: an instance is unaffected, and a
	@property setter now SEES the augmented store rather than being written
	past -- which is what routing it the same way as a plain assignment
	means."

	self assertMatchesCPythonAt: 'instance_augmented'.
	self assertMatchesCPythonAt: 'property_setter_saw'.
%

category: 'Grail-Tests - the dynamic builder'
method: InitSubclassMroTestCase
testTypeRunsBothHalvesOfPep487
	"``type(name, bases, ns)'' ran neither, so a dynamically built class got
	nothing the identical class statement gets.  The statement row beside it
	is what the dynamic one has to match."

	self assertMatchesCPythonAt: 'type_runs_init_subclass'.
	self assertMatchesCPythonAt: 'type_runs_set_name'.
	self assertMatchesCPythonAt: 'statement_runs_set_name'.
%

category: 'Grail-Tests - the dynamic builder'
method: InitSubclassMroTestCase
testTypeForwardsClassKeywordsToTheHook
	"CPython's 3.6+ ``type(name, bases, ns, **kwds)''.  A keyword the hook
	will not take is refused by the hook, naming the hook's OWNER -- and a
	stray keyword with no hook at all still reaches object's terminator."

	self assertMatchesCPythonAt: 'type_forwards_keywords'.
	self assertMatchesCPythonAt: 'type_keyword_refused_by_hook'.
	self assertMatchesCPythonAt: 'stray_keyword_still_refused'.
%

category: 'Grail-Tests - the dynamic builder'
method: InitSubclassMroTestCase
testNewClassForwardsItsKeywordsAndPrepareClassDoesNot
	"The asymmetry test_errors asserts: the same arguments raise through
	new_class, which calls the builder, and do not through prepare_class,
	which never does."

	self assertMatchesCPythonAt: 'new_class_refuses_bad_keyword'.
	self assertMatchesCPythonAt: 'prepare_class_allows_it'.
	self assertMatchesCPythonAt: 'new_class_plain'.
	self assertMatchesCPythonAt: 'new_class_with_body'.
%

category: 'Grail-Tests - Controls'
method: InitSubclassMroTestCase
testTheOrdinarySingleBaseChainIsUnchanged
	"The whole corpus bar the mixin case.  The MRO walk must leave a plain
	chain exactly as it was, including which hooks run for a class that adds
	none of its own."

	self assertMatchesCPythonAt: 'single_chain_order'.
	self assertMatchesCPythonAt: 'single_chain_one_hook'.
%

category: 'Grail-Tests - Controls'
method: InitSubclassMroTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '24 checks, 0 disagreeing [], keys match: True'
%
