! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MetaclassDispatchTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassDispatchTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MetaclassDispatchTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MetaclassDispatchTestCase
!
! ``class A(metaclass=M)'' now RUNS M.__new__ and M.__init__.
!
! Grail recorded a ``metaclass='' and reported it from type() (#459), but the
! metaclass never took part in building the class.  It does now, which is the
! last of the four steps that started with giving ``type'' a real object:
!
!   #454  PyType exists, so ``class M(type)'' has a base
!   #458  ``type'' is callable and comparable, so issubclass(M, type) holds
!   #459  type(A) reports the declared metaclass
!   here  A is actually BUILT through it
!
! THE ORDER IS INVERTED, AND DELIBERATELY SO.  CPython evaluates the statement
! as ``M(name, bases, ns)'', so M builds the class.  Grail cannot: a class body
! compiles onto a real Smalltalk class before any hook can run, and that class
! is what the module's methods, closure cells and __class__ references are
! already bound to.  Building a second one would leave the first live and
! referenced.  So the class is built first and M is run OVER it, with
! ``type.__new__'' answering the class UNDER CONSTRUCTION instead of making a
! new one.  For the shape every metaclass in the corpus is written in --
! ``self = super().__new__(...)'', mutate, ``return self'' -- the two orders
! are indistinguishable.
!
! WHAT THE RETURN VALUE DOES.  ClassDefAst emits the dispatch as
! ``A := A ___grailDispatchMetaclass___'', so a metaclass may answer something
! that is not a class at all -- test_super returns None and test_subclassinit
! returns 0, and both bind that to the class name.  This is also why the
! dispatch is the LAST class-construction step: it used to sit at the
! ___pyClassDefined___ hook, and every send after it (__init_subclass__, the
! class keywords, dropping the namespace) was then aimed at None.
!
! THREE THINGS MEASUREMENT FORCED, each recorded where it lives:
!
!   * super().__new__(cls, name, bases, ns) is FOUR positional arguments, and
!     Super's selector family stopped at three -- so it never tried
!     __new__:_:_:_:, fell through to the generic allocation path, and answered
!     an INSTANCE of the metaclass.  Nothing about that was metaclass-specific;
!     any four-argument super() call had it.  Super builds the selector now.
!   * a SMALLTALK metaclass must be excluded.  EnumMeta also defines __new__,
!     but with the enum machinery's signature; handing it CPython's four
!     arguments killed every mixin-coercion test with ``<enum 'Enum class'>
!     has no members''.  Only a metaclass rooted at PyType qualifies.
!   * "defines __new__" has to mean OVERRIDES it.  ``object'' defines
!     ___new__:kw: and PyType inherits it, so an attribute-load test answered
!     true for every metaclass alive: ABCMeta, which overrides neither, was
!     handed a namespace and had it written back over its class's own methods.
!     ``class B(OperationLogger, metaclass=ABCMeta)'' lost its __ge__ and a
!     comparison that should end in TypeError raised AttributeError instead
!     (test_binop test_comparison_orders).  The owner must be STRICTLY below
!     PyType.
!
! STILL NOT DONE: __classcell__ is not injected into the namespace, so the
! ``__class__'' cell cluster in test_super remains.  A metaclass __call__ is
! not consulted, and mro() is not.
!
! Measured: test_super 19 -> 18 failing, test_subclassinit 10 -> 9, with no
! regression across the corpus.  Every expectation below is CPython 3.14.6's
! own output for tests/python/metaclass_dispatch.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MetaclassDispatchTestCase removeAllMethods.
MetaclassDispatchTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassDispatchTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_dispatch' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_dispatch.py')
		name: 'metaclass_dispatch'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: MetaclassDispatchTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the headline: the metaclass runs ---

category: 'Grail-Tests - Dispatch'
method: MetaclassDispatchTestCase
testMetaclassNewAndInitBothRun
	"``M.__new__'' then ``M.__init__'', in that order, over the class being
	defined.  Neither was reached before: a ``metaclass='' was a RECORD, and
	nothing dispatched it."

	self assert: (self at: 'new_ran') @env0:asString equals: 'new'.
	self assert: (self at: 'init_ran') @env0:asString equals: 'init'.
%

category: 'Grail-Tests - Dispatch'
method: MetaclassDispatchTestCase
testTheClassBodySurvivesTheMetaclass
	"The guard that matters for the inverted order.  ``super().__new__''
	answers the class UNDER CONSTRUCTION rather than building a second one, so
	the body's attributes and methods are still there afterwards -- a fresh
	class built from the namespace would have lost whatever the namespace does
	not carry."

	self assert: ((self at: 'body_survives') asArray
			collect: [:e | e @env0:asString])
		equals: #( '2' 'm' ).
%

category: 'Grail-Tests - Dispatch'
method: MetaclassDispatchTestCase
testTheDispatchedMetaclassIsStillReportedByType
	"The dispatch must not disturb what #459 established."

	self assert: (self at: 'type_is_meta') @env0:asString equals: 'MSelf'.
	self assert: (self at: 'isinstance_of_meta') equals: true.
%

! --- the namespace ---

category: 'Grail-Tests - Namespace'
method: MetaclassDispatchTestCase
testTheNamespaceCarriesTheWholeBody
	"``ns'' is a real mapping holding the class body -- assignments AND defs,
	which is what the class-body namespace staging put there.  Every metaclass
	in the corpus that overrides __new__ reads or mutates it, so handing over an
	empty one would be worse than not dispatching at all."

	self assert: ((self at: 'ns_keys') asArray
			collect: [:e | e @env0:asString])
		equals: #( 'a' 'f' ).
%

category: 'Grail-Tests - Namespace'
method: MetaclassDispatchTestCase
testAnAdditionToTheNamespaceReachesTheClass
	"``ns['injected'] = ...'' before super().__new__ lands as a class
	attribute, because ``build a class with this namespace'' is what
	type.__new__ MEANS.  Grail's class already carries every binding the body
	made; this is the write the metaclass itself made afterwards, which is the
	whole reason several metaclasses override __new__ (``namespace
	['__classcell__'] = cell'')."

	self assert: (self at: 'ns_injection_lands') @env0:asString
		equals: 'from_namespace'.
%

! --- the return value ---

category: 'Grail-Tests - Return value'
method: MetaclassDispatchTestCase
testAMetaclassMayReturnSomethingThatIsNotAClass
	"CPython binds whatever __new__ answers, so a class name need not hold a
	class.  test_super returns None and test_subclassinit returns 0.

	This is what forced the dispatch to be the LAST class-construction step:
	sitting at the ___pyClassDefined___ hook, every send after it was aimed at
	None."

	self assert: (self at: 'new_returning_none') equals: true.
	self assert: (self at: 'new_returning_zero') equals: true.
%

! --- the exclusion that measurement forced ---

category: 'Grail-Tests - Guards'
method: MetaclassDispatchTestCase
testAMetaclassThatConstructsNothingIsLeftAlone
	"ABCMeta overrides neither __new__ nor __init__ and must not be handed the
	construction protocol.

	It nearly was.  ``object'' defines ___new__:kw: and PyType inherits it, so
	testing for the method with an attribute load answered true for EVERY
	metaclass: ABCMeta was handed a namespace, and type.__new__ wrote that
	namespace back over the class's own methods.  ``class B(OperationLogger,
	metaclass=ABCMeta)'' lost its __ge__ to an UnboundMethod owned by ABCMeta,
	and a comparison that should end in TypeError raised AttributeError
	(test_binop test_comparison_orders).  The defining class must be STRICTLY
	below PyType."

	self assert: (self at: 'nonconstructing_metaclass_untouched') @env0:asString
		equals: 'TypeError'.
	self assert: (self at: 'nonconstructing_keeps_its_type') @env0:asString
		equals: 'ABCMeta'.
%
