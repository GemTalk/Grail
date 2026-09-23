! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecWithClosureTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecWithClosureTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecWithClosureTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecWithClosureTestCase
!
! ``exec(code, globals, closure=cells)'' runs a def's body with its free
! variables bound to the cells you supply.
!
! GRAIL CANNOT RE-ENTER A COMPILED CLOSURE WITH DIFFERENT CELLS.  Its free
! variables are Smalltalk temps captured when the def ran, so there is nothing to
! substitute into -- which is why this looked out of reach and was set aside
! twice.  What it CAN do is run the body's SOURCE again against a namespace built
! from the cells, so a def with free variables now carries its body text on its
! code object.  The observable behaviour is CPython's; the mechanism is
! different, and the comment on ___execWithClosure___ says so rather than
! implying a closure was substituted.
!
! The body text is captured at emit time, from the module's own source -- which
! ModuleAst records in parseSource: -- sliced by LINE from the first statement to
! the def's end, dedented, and with its ``nonlocal'' declarations removed.  By
! line because the caller wants a compilable fragment and a body always starts on
! its own line; nonlocal goes because those names are supplied by the closure
! instead, and because ``nonlocal'' at module level -- which is what exec()ing the
! body makes it -- is a SyntaxError.
!
! Only for a def WITH free variables: CPython refuses closure= outright for a
! code object without them, so carrying the text for every def in the corpus
! would be a copy per def bought for nothing.
!
! THE WRITE-BACK GOES THROUGH ``cell.cell_contents = v''.  The cell's own setter
! is what makes a write reach the variable it boxes; a dynamic-instVar store
! writes PAST it, and then the exec produces the right value and nothing can see
! it.  That is exactly what the first cut did -- the namespace afterwards held
! 2520 and the enclosing variable still read 0.
!
! SIX OF THE NINE CHECKS ARE REFUSALS, and they all report the same thing.  A
! list of the right length, and a tuple of the right length holding a non-cell,
! both report ``requires a closure of exactly length N'': CPython names the
! LENGTH whatever the fault was.  Three separate, more descriptive messages read
! better and are wrong.
!
! Drives tests/python/exec_with_closure.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.  Note that its work happens inside a function: at
! module level ``result'' would be a global and the defs would have no free
! variable to close over, so the fixture would test nothing.
!
! test_builtin's test_exec_closure.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecWithClosureTestCase removeAllMethods.
ExecWithClosureTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecWithClosureTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exec_with_closure' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_with_closure.py')
		name: 'exec_with_closure'.
%

category: 'Grail-Private'
method: ExecWithClosureTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - the substitution'
method: ExecWithClosureTestCase
testTheBodyRunsWithTheSuppliedCells
	"The first row runs with the def's OWN cells and the second with two
	replaced -- 2*3 against 35*72.  The second is the one that proves the
	cells are being used rather than the def being called."

	self assertMatchesCPythonAt: 'own_closure'.
	self assertMatchesCPythonAt: 'substituted_closure'.
%

category: 'Grail-Tests - the refusals'
method: ExecWithClosureTestCase
testEveryMalformedClosureIsRefused
	"Six shapes, one message.  CPython names the LENGTH whatever the fault
	was, so a list of the right length and a tuple holding a non-cell report
	what looks like the wrong complaint -- and matching it is the point."

	self assertMatchesCPythonAt: 'no_free_variables'.
	self assertMatchesCPythonAt: 'closure_is_none'.
	self assertMatchesCPythonAt: 'wrong_length'.
	self assertMatchesCPythonAt: 'a_list_not_a_tuple'.
	self assertMatchesCPythonAt: 'string_source_any_closure'.
	self assertMatchesCPythonAt: 'string_source_real_closure'.
	self assertMatchesCPythonAt: 'tuple_with_a_non_cell'.
%

category: 'Grail-Tests - Controls'
method: ExecWithClosureTestCase
testTheClosureItselfIsUndisturbed
	"Carrying the body text must not change what the def IS: its free
	variables, its cells, and calling it normally are all as before."

	self assertMatchesCPythonAt: 'freevars'.
	self assertMatchesCPythonAt: 'closure_length'.
	self assertMatchesCPythonAt: 'plain_call'.
%

category: 'Grail-Tests - Controls'
method: ExecWithClosureTestCase
testOrdinaryExecAndCellsAreUnaffected
	"An exec with no closure at all, and a cell used on its own."

	self assertMatchesCPythonAt: 'exec_without_closure'.
	self assertMatchesCPythonAt: 'cell_roundtrip'.
%

category: 'Grail-Tests - Controls'
method: ExecWithClosureTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '15 checks, 0 disagreeing [], keys match: True'
%
