! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyNamespaceDefsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyNamespaceDefsTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyNamespaceDefsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyNamespaceDefsTestCase
!
! Stage 6 of the class-body namespace (docs/Class_Body_Namespace.md): a
! class-body ``def'' and a nested ``class'' are offered to the prepared
! namespace, at their own source position.
!
! CPython EXECUTES a class body against the mapping ``__prepare__'' returned,
! so that mapping holds a function object for every def and the class object
! for every nested class, interleaved with the assignments in body order.
! Grail SCANS a body for the names it binds and emits one accessor store per
! name.  Stages 1-5 connected the ASSIGNMENTS; a def and a nested class still
! bypassed the mapping, because neither produces a value where the body binds
! the name -- a def compiles to a Smalltalk METHOD, a nested class is built and
! stored through ___classHolderAttrStore___.  A prepared namespace therefore
! saw ``a'', ``b'', ``c'' and never ``f'' or ``Inner''.
!
! The doc calls this the load-bearing remaining gap, and it is the prerequisite
! for handing a faithful namespace to a metaclass's __new__ (stage 7) -- every
! test in test_super's __classcell__ cluster reads a ``def'' back out of the
! namespace it was given.
!
! Two things this does NOT do, both deliberate and both recorded in the code:
!
!   * The value is READ BACK OFF THE CLASS, not passed in -- by the time the
!     bind runs the method is compiled and the nested class stored.  That is
!     also what makes a DECORATED def come out right: the decorator has already
!     rebound the name in the ___dynInstVars___ holder, and the load reads the holder
!     first, so the mapping sees the decorated object.
!   * Unlike ___grailNsStore___:value: it does not read the value back OUT of
!     the mapping onto the class -- the method is already compiled, so a
!     namespace that transforms a def is recorded and not reflected.  Nothing
!     can observe that difference until stage 7.
!
! ``async def'' is bound by the same emit but is a no-op today: Grail does not
! compile a class-body ``async def'' to an attribute at all, so there is
! nothing to offer.  That is a separate, pre-existing gap and is not asserted
! here.
!
! Every expectation is CPython 3.14.6's own output for
! tests/python/class_body_namespace_defs.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyNamespaceDefsTestCase removeAllMethods.
ClassBodyNamespaceDefsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyNamespaceDefsTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_namespace_defs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_namespace_defs.py')
		name: 'class_body_namespace_defs'.
	probe := (testModule @env1:___pyAttrLoad___: #'report')
		@env1:___pyCallValue___: #() kw: nil.
%

category: 'Grail-Private'
method: ClassBodyNamespaceDefsTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the headline: source order, with defs and nested classes in it ---

category: 'Grail-Tests - Source Order'
method: ClassBodyNamespaceDefsTestCase
testTheNamespaceSeesEveryBindingInSourceOrder
	"The whole point.  Before, the mapping recorded only the assignments --
	``a'', ``b'', ``c'' -- so a metaclass could not see the body it was
	about to be handed."

	self assert: ((self at: 'order') asArray
			collect: [:e | e @env0:asString])
		equals: #( 'a' 'f' 'b' 'Inner' 'c' 'decorated' ).
%

category: 'Grail-Tests - Source Order'
method: ClassBodyNamespaceDefsTestCase
testABodyOfPlainAssignmentsIsUnchanged
	"The path stages 1-5 already had.  A body with no def and no nested class
	must record exactly what it did before."

	self assert: ((self at: 'plain_order') asArray
			collect: [:e | e @env0:asString])
		equals: #( 'x' 'y' ).
%

! --- what the namespace is given for each kind ---

category: 'Grail-Tests - Bound Values'
method: ClassBodyNamespaceDefsTestCase
testADefArrivesAsSomethingCallable
	"CPython puts a function object here and Grail an unbound method, so the
	assertion is callability rather than type -- the difference is real and
	is not what this stage is about."

	self assert: (self at: 'f_callable') equals: true.
%

category: 'Grail-Tests - Bound Values'
method: ClassBodyNamespaceDefsTestCase
testANestedClassArrivesAsAClass
	self assert: (self at: 'inner_is_class') equals: true.
%

category: 'Grail-Tests - Bound Values'
method: ClassBodyNamespaceDefsTestCase
testADecoratedDefBindsUnderItsOwnName
	"Reading the value OFF THE CLASS rather than passing it in is what makes
	this work: the decorator has already rebound the name, and the load sees
	the rebinding rather than the raw compiled method."

	self assert: (self at: 'decorated_present') equals: true.
	self assert: (self at: 'decorated_callable') equals: true.
%

! --- guards: the class is still built correctly from that body ---

category: 'Grail-Tests - Guards'
method: ClassBodyNamespaceDefsTestCase
testTheClassIsStillBuiltFromTheBody
	"The bind is additive -- it must not disturb what the body compiles to.
	Method, nested class, decorated method and a plain attribute, all read
	back off the finished class."

	self assert: (self at: 'f_result') @env0:asString equals: 'f'.
	self assert: (self at: 'inner_name') @env0:asString equals: 'Inner'.
	self assert: (self at: 'decorated_result') @env0:asString equals: 'decorated'.
	self assert: (self at: 'c_value') equals: 3.
%
