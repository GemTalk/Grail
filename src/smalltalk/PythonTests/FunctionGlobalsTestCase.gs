! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctionGlobalsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FunctionGlobalsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FunctionGlobalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FunctionGlobalsTestCase
!
! ``func.__globals__'' -- the LIVE namespace of the module a callable was
! defined in.  Closes test_funcattrs' test___globals__.
!
! IDENTITY IS THE CONTRACT.  CPython's __globals__ is the module's actual
! namespace dict: the same object ``globals()'' answers inside that module and
! the same one ``mod.__dict__'' does.  test___globals__ checks it with assertIs,
! and it has to -- a per-read copy would satisfy equality and still be wrong,
! because the point of __globals__ is to resolve a free name the way the
! defining module would, and a snapshot stops tracking the module as soon as
! either side changes.
!
! Grail already had the machinery: PyModuleDict class >> on: memoises ONE view
! per module per session, precisely so that globals(), mod.__dict__ and this all
! answer the identical object.  What was missing was the route from a callable
! to its module.
!
! RESOLVED THROUGH __module__, which FunctionDefAst stamps unconditionally on
! every def and lambda.  One sys.modules probe, against the scan over every
! loaded module's __file__ that PyFrame >> f_globals must do -- f_globals starts
! from a code object's co_filename and has no name to work with, whereas a
! function object does.  Both halves now go through
! PyModuleDict class >> ___forModuleNamed___: so they cannot drift.
!
! WHY TWO IMPLEMENTATIONS.  A Grail function is one of two unrelated objects: a
! module-level def or method is a BoundMethod, and a nested def or lambda is a
! Smalltalk block.  The block half CANNOT live on ExecBlock: ExecBlock.gs is
! filed into the SHARED base on 3.7 (scripts/install_base37.gs), so a method
! there would be SystemUser-owned and shared by every user of the extent.  It
! goes in per-user ExecBlockAttrs instead, which ExecBlock >> __getattr__ already
! routes misses through -- the same arrangement __defaults__ and __closure__ use.
!
! THE SUBTLER HALF WAS THE ATTRIBUTE PROTOCOL, not the resolution.  Grail wraps a
! dunder read as a BoundMethod unless the class lists it in
! ___pythonValueAttrs___, so the first working version answered a BoundMethod
! here rather than the dict: ``top.__globals__ is globals()'' was False and
! ``type(top.__globals__).__name__'' was 'BoundMethod'.  That presents as an
! identity bug and is really an attribute that was never evaluated.  Adding
! __globals__ to that set is what fixed it, and
! testGlobalsIsAMappingNotACallable is the tripwire -- a check on identity alone
! would have passed once resolution was right even if the wrapping came back.
!
! ONE MEASUREMENT CORRECTED HERE, because the wrong version was briefly in the
! tree: a special case answering ``PyModuleDict on: receiver'' directly when the
! receiver is a module was added on the theory that the name round-trip landed on
! a different module object.  It did not.  Removing the special case and
! re-measuring gave identity in both cases, so the sole cause was the missing
! value-attr hook, and the special case was deleted rather than left as dead
! complexity carrying a false explanation.
!
! An UNRESOLVABLE module answers AttributeError, not None.  Every real function
! has globals, so a None would invite ``f.__globals__.get(...)'' to fail with a
! TypeError far from the cause; AttributeError says the thing that is true --
! this callable cannot say where it was defined -- and is what the attribute did
! before it existed, so nothing probing with hasattr changes behaviour.
!
! Drives tests/python/function_globals.py, which is self-running and so
! self-verifies against CPython under scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FunctionGlobalsTestCase removeAllMethods.
FunctionGlobalsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FunctionGlobalsTestCase
setUp
	"Reloaded per test: globals_are_live_not_a_snapshot WRITES into the module
	namespace, and although it removes what it planted, a shared instance would
	make that cleanup load-bearing for the other tests rather than merely tidy."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_globals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_globals.py')
		name: 'function_globals'.
%

category: 'Grail-Private'
method: FunctionGlobalsTestCase
assertCheckPasses: aName
	"The fixture answers true, or a string naming what it saw.  Reported either
	way -- an identity failure has several possible causes (a copy, a wrapped
	accessor, the wrong module) and the string distinguishes them."

	| answer |
	answer := testModule @env0:perform: aName asSymbol env: 1.
	self assert: (answer = true)
		description: 'function-globals check failed: ' , aName , ' -> ' , answer printString.
%

category: 'Grail-Tests - Identity'
method: FunctionGlobalsTestCase
testAModuleLevelFunctionSeesItsModuleGlobals
	"``top_level.__globals__ is globals()''.  A module-level def is a
	BoundMethod whose receiver is the module."

	self assertCheckPasses: 'a_module_level_function_sees_its_module_globals'.
%

category: 'Grail-Tests - Identity'
method: FunctionGlobalsTestCase
testANestedFunctionSeesTheSameGlobals
	"Not a restatement of the test above.  A nested def is a Smalltalk BLOCK, a
	different class reached by a different route (per-user ExecBlockAttrs rather
	than a BoundMethod method), so the two can regress independently."

	self assertCheckPasses: 'a_nested_function_sees_the_same_globals'.
%

category: 'Grail-Tests - Identity'
method: FunctionGlobalsTestCase
testAMethodAndABoundMethodSeeThem
	"Both handle shapes for a method: the unbound one off the class and the
	bound one off an instance.  They resolve their module from different
	receivers -- a class and an instance -- which is the case
	BoundMethod >> __module__ reconciles."

	self assertCheckPasses: 'a_method_sees_its_defining_modules_globals'.
	self assertCheckPasses: 'a_bound_method_sees_them_too'.
%

category: 'Grail-Tests - Identity'
method: FunctionGlobalsTestCase
testTwoFunctionsInOneModuleShareOneGlobals
	"The memo is per MODULE, not per function.  A per-function view would pass
	every check above and fail this one."

	self assertCheckPasses: 'two_functions_in_one_module_share_one_globals'.
%

category: 'Grail-Tests - The Attribute Protocol'
method: FunctionGlobalsTestCase
testGlobalsIsAMappingNotACallable
	"THE TRIPWIRE for the bug that actually took two attempts.  Grail wraps a
	dunder read as a BoundMethod unless the class lists it in
	___pythonValueAttrs___, so __globals__ answered a callable rather than the
	dict -- correct resolution, delivered wrapped.  Checked as ``has keys, is not
	callable, and contains a known module name'' rather than by type name, so it
	holds for whichever mapping class the module namespace uses."

	self assertCheckPasses: 'a_module_level_function_sees_a_mapping'.
%

category: 'Grail-Tests - Liveness'
method: FunctionGlobalsTestCase
testGlobalsAreLiveNotASnapshot
	"Why identity is the contract and not merely a nicety: a name planted in
	globals() must be visible through __globals__ and a name written through
	__globals__ must be visible in globals().  A copy passes every equality
	check and fails both directions of this one."

	self assertCheckPasses: 'globals_are_live_not_a_snapshot'.
%

category: 'Grail-Tests - Write Guards'
method: FunctionGlobalsTestCase
testGlobalsCannotBeAssignedOrDeleted
	"These already worked before the read existed -- __globals__ was listed in
	___readOnlyFunctionAttrs___ all along, which is why the gap was write-shaped
	from one side and read-shaped from the other.  Pinned so a change to the read
	path cannot quietly open the write one."

	self assertCheckPasses: 'globals_cannot_be_assigned'.
	self assertCheckPasses: 'globals_cannot_be_deleted'.
%

set compile_env: 0
