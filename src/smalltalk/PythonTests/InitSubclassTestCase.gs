! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InitSubclassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InitSubclassTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InitSubclassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InitSubclassTestCase
!
! PEP 487's ``__init_subclass__'': a class is told when someone subclasses it,
! which is how a base registers, validates or configures its subclasses without
! anyone having to write a metaclass.
!
!     class Base:
!         def __init_subclass__(cls, **kwds):
!             super().__init_subclass__(**kwds)
!             registry.append(cls)
!
! Grail never called it.  The hook now fires from the class statement at
! CPython's moment -- inside type.__new__, so after the metaclass hook and
! before the decorators.
!
! The subtlety the protocol turns on is WHERE the lookup starts: CPython calls
! ``super(cls, cls).__init_subclass__(**kwds)'', so a class's own definition
! never runs for itself, only for its subclasses.  Starting at the class instead
! would also recurse forever, since the first act of an ordinary implementation
! is to delegate upwards.
!
! Drives tests/python/init_subclass.py.  test_enum
! OldTestFlag.test_init_subclass.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InitSubclassTestCase removeAllMethods.
InitSubclassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InitSubclassTestCase
setUp
	"Reload tests/python/init_subclass.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'init_subclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/init_subclass.py')
		name: 'init_subclass'.
%

category: 'Grail-Private'
method: InitSubclassTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Who gets told'
method: InitSubclassTestCase
testTheHookRunsForSubclassesAndNotForItsOwnClass
	"``super(cls, cls)'' starts the lookup at the PARENT, so Base's hook fires
	for Mid and for Quiet but never for Base."

	self assert: (self resultAt: 'seen') asString
		equals: 'Base saw Mid;Base saw Quiet;Mid saw Quiet'.
	self assert: (self resultAt: 'base_own') asString equals: 'ABSENT'.
	self assert: (self resultAt: 'mid_test1') asString equals: 'Base'.
%

category: 'Grail-Tests - Who gets told'
method: InitSubclassTestCase
testTheChainIsCooperative
	"Mid calls super(), so Quiet is reached by both hooks."

	self assert: (self resultAt: 'quiet_test1') asString equals: 'Base'.
	self assert: (self resultAt: 'quiet_test2') asString equals: 'Mid'.
%

category: 'Grail-Tests - Who gets told'
method: InitSubclassTestCase
testAHookThatDoesNotDelegateStopsTheChain
	"Quiet's hook never calls super(), so Leaf hears from nobody -- the
	behaviour test_init_subclass pins, and the reason the chain is the
	implementation's business rather than the machinery's."

	self assert: (self resultAt: 'leaf_test1') asString equals: 'ABSENT'.
	self assert: (self resultAt: 'leaf_test2') asString equals: 'ABSENT'.
%

category: 'Grail-Tests - Who gets told'
method: InitSubclassTestCase
testTheExplicitClassmethodSpellingIsFoundToo
	"CPython makes __init_subclass__ an implicit classmethod, so ``@classmethod''
	on it is redundant -- but legal, and common in code written before that was
	true.  Grail compiles a plain def instance-side and a decorated one
	class-side, so the lookup has to search both dictionaries; only the first
	spelling was found until it did."

	self assert: (self resultAt: 'explicit_classmethod') asString equals: 'yes'.
	self assert: (self resultAt: 'explicit_own') asString equals: 'ABSENT'.
%

category: 'Grail-Tests - Class keywords'
method: InitSubclassTestCase
testClassKeywordsReachTheHook
	"What the protocol is mostly used for: the class header carries the
	configuration and the base consumes it."

	self assert: (self resultAt: 'plugin_names') asString equals: '[''alpha'', ''beta'']'.
	self assert: (self resultAt: 'alpha_name') asString equals: 'alpha'.
	self assert: (self resultAt: 'beta_name') asString equals: 'beta'.
%

category: 'Grail-Tests - Class keywords'
method: InitSubclassTestCase
testAKeywordNobodyAcceptedIsAnError
	"A class keyword no one in the chain consumed is a typo, and CPython says
	so from object.__init_subclass__ rather than dropping it silently -- which
	is what Grail did before, misspelling included.

	The message NAMES THE CLASS BEING CREATED, not object.  That is CPython
	3.14's wording, measured; this test pinned ``object.__init_subclass__()''
	until 2026-08-31, which is a text CPython 3.14 never produces -- the
	fixture records str(e) and so agrees with whichever implementation ran it,
	and only this assertion said which."

	self assert: (self resultAt: 'unconsumed') asString
		equals: 'Typo.__init_subclass__() takes no keyword arguments'.
	self assert: (self resultAt: 'unconsumed_no_hook') asString
		equals: 'NoHookSub.__init_subclass__() takes no keyword arguments'.
%

category: 'Grail-Tests - Class keywords'
method: InitSubclassTestCase
testMetaclassIsWithheld
	"``metaclass='' is consumed by the class machinery itself, so it is not
	forwarded and does not trip the complaint above."

	self assert: (self resultAt: 'with_meta') asString equals: 'meta'.
%

category: 'Grail-Tests - Enums'
method: InitSubclassTestCase
testAMetaclassCannotSwallowTheHook
	"Enum builds its class through a ___pyClassDefined___: override.  CPython
	puts the __init_subclass__ call in type.__new__ precisely so no metaclass
	can lose it -- every one of them reaches it through super().__new__ -- and
	the send is emitted from the class statement here for the same reason."

	self assert: (self resultAt: 'their_tag') asString equals: 'MyFlag'.
	self assert: (self resultAt: 'colours_tag') asString equals: 'MyFlag'.
	self assert: (self resultAt: 'colours_members') asString equals: '[''RED'', ''GREEN'']'.
%

category: 'Grail-Tests - Enums'
method: InitSubclassTestCase
testBoundaryIsWithheld
	"The other withheld keyword: EnumType.__new__ declares ``boundary'' as a
	parameter, so it never reaches __init_subclass__ -- forwarding it would
	turn every ``class E(Flag, boundary=KEEP)'' into a TypeError."

	self assert: (self resultAt: 'bounded_tag') asString equals: 'MyFlag'.
	self assert: (self resultAt: 'bounded_boundary_kept') asString equals: 'True'.
%

category: 'Grail-Tests - When it fires'
method: InitSubclassTestCase
testTheHookSeesAPopulatedClassAndRunsBeforeDecorators
	"CPython fires it inside type.__new__: the namespace is installed, so the
	subclass's own attributes and methods are already there, and the class
	decorators have not run yet."

	self assert: (self resultAt: 'order') asString
		equals: 'hook sees flavour=''vanilla'';hook sees method=True;decorator'.
%
