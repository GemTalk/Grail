! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuiltinsReduceAndImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinsReduceAndImportTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BuiltinsReduceAndImportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BuiltinsReduceAndImportTestCase
!
! Two builtins a piece of code reaches WITHOUT naming them, and which a
! ``__builtins__'' override therefore also owns.
!
! __reduce__ ON AN ITERATOR names the callable that rebuilds it, and CPython
! resolves that name in the FRAME's builtins -- listiter_reduce calls
! _PyEval_GetBuiltin on 'iter'.  So under an empty __builtins__ it raises
! AttributeError for the bare name rather than answering the real iter.  Grail's
! list_iterator had no __reduce__ at all and fell through to the inherited
! NotImplemented, so a list iterator did not pickle: the gap was not the
! override, it was the whole method.
!
! The shape has three parts worth naming.  The callable differs by DIRECTION --
! iter forward, reversed backward.  A SPENT iterator answers a two-element tuple
! over an EMPTY list and no index at all, which is how CPython says ``nothing
! left'' without encoding a position the list may since have invalidated.  And a
! live one hands back the WHOLE collection plus the index, not the remainder.
!
! reversed is compared by IDENTITY rather than by repr, because CPython's
! reversed is a CLASS and Grail's is a builtin function -- the same difference
! iterator >> ___builtinNamed___ already documents for map/filter/zip, and the
! reason that method names the callable rather than the type.
!
! AN ``import'' STATEMENT calls __import__, looked up the same way.  An empty
! __builtins__ forbids importing, and a mapping supplying one has THAT called,
! with the five arguments CPython passes -- the globals and locals being the
! mappings exec() was GIVEN, which the test compares by identity.
!
! THE GATE IS EMITTED, NOT CHECKED IN THE SHARED METHOD, and that is the part
! worth keeping.  A check inside ___import__:kw: gates every import made while
! an override is installed, INCLUDING GRAIL'S OWN: raising a NameError inside
! exec'd code makes the traceback machinery import ``re'', which then became
! ``ImportError: __import__ not found'' and replaced the exception the caller
! was waiting for.  Three already-closed tests regressed that way, every one of
! them naming a module its source never mentions.  ImportAst/ImportFromAst now
! choose the selector at emit time, so only an import the SOURCE wrote is gated.
!
! Drives tests/python/builtins_reduce_and_import.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
!
! test_builtin's test_eval_builtins_mapping_reduce and
! test_exec_builtins_mapping_import.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BuiltinsReduceAndImportTestCase removeAllMethods.
BuiltinsReduceAndImportTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BuiltinsReduceAndImportTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'builtins_reduce_and_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtins_reduce_and_import.py')
		name: 'builtins_reduce_and_import'.
%

category: 'Grail-Private'
method: BuiltinsReduceAndImportTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - iterator reduce'
method: BuiltinsReduceAndImportTestCase
testAListIteratorReduces
	"It had no __reduce__ and inherited NotImplemented.  The three states are
	distinct shapes, not one shape with different numbers in it."

	self assertMatchesCPythonAt: 'fresh'.
	self assertMatchesCPythonAt: 'partial'.
	self assertMatchesCPythonAt: 'spent'.
	self assertMatchesCPythonAt: 'spent_has_no_index'.
%

category: 'Grail-Tests - iterator reduce'
method: BuiltinsReduceAndImportTestCase
testAReverseIteratorNamesReversed
	"By identity, not by repr: CPython's reversed is a class and Grail's is a
	builtin function.  What must agree is WHICH callable and what state rides
	with it."

	self assertMatchesCPythonAt: 'reversed_callable'.
	self assertMatchesCPythonAt: 'reversed_state'.
	self assertMatchesCPythonAt: 'reversed_after_one'.
	self assertMatchesCPythonAt: 'forward_callable'.
%

category: 'Grail-Tests - iterator reduce'
method: BuiltinsReduceAndImportTestCase
testAnIteratorRoundTripsThroughPickle
	"What __reduce__ is for.  A half-consumed iterator resumes where it left
	off, which is the property the state slot exists to carry."

	self assertMatchesCPythonAt: 'pickle_fresh'.
	self assertMatchesCPythonAt: 'pickle_partial'.
%

category: 'Grail-Tests - resolved in the code''s builtins'
method: BuiltinsReduceAndImportTestCase
testTheReduceCallableComesFromTheCodesBuiltins
	"Not from the real builtins: an empty __builtins__ makes __reduce__ raise
	AttributeError for the bare name."

	self assertMatchesCPythonAt: 'reduce_no_builtins'.
	self assertMatchesCPythonAt: 'reduce_iter_supplied'.
%

category: 'Grail-Tests - resolved in the code''s builtins'
method: BuiltinsReduceAndImportTestCase
testImportIsGatedTheSameWay
	"Both emit sites -- plain ``import'' and ``from X import y''.  The middle
	row is the one that pins the ARGUMENTS: a custom __import__ receives the
	mappings exec() was given, compared by identity."

	self assertMatchesCPythonAt: 'import_no_builtins'.
	self assertMatchesCPythonAt: 'import_custom_called'.
	self assertMatchesCPythonAt: 'import_from_gated'.
%

category: 'Grail-Tests - Controls'
method: BuiltinsReduceAndImportTestCase
testOnlyAnImportTheSourceWroteIsGated
	"THE CONTROL THAT CAUGHT THE FIRST CUT.  Checking inside the shared
	__import__ entry point gates GRAIL'S OWN imports too: an exec that RAISES
	makes the traceback machinery import ``re'', and the NameError came back
	as ``ImportError: __import__ not found''.  Three closed tests regressed,
	each naming a module its source never mentions."

	self assertMatchesCPythonAt: 'raising_exec_keeps_its_error'.
	self assertMatchesCPythonAt: 'raising_exec_plain'.
	self assertMatchesCPythonAt: 'normal_import_in_exec'.
	self assertMatchesCPythonAt: 'module_scope_import_unaffected'.
	self assertMatchesCPythonAt: 'map_reduce_unchanged'.
%

category: 'Grail-Tests - Controls'
method: BuiltinsReduceAndImportTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '20 checks, 0 disagreeing [], keys match: True'
%
