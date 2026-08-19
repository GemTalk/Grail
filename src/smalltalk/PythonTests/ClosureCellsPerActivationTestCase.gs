! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClosureCellsPerActivationTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClosureCellsPerActivationTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClosureCellsPerActivationTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClosureCellsPerActivationTestCase
!
! A CLOSURE CELL BELONGS TO AN ACTIVATION, NOT TO A ``def''.
!
! Two calls to one factory produce two functions over two DIFFERENT bindings.
! Grail gave both the FIRST call's cells:
!
!     f1, f2 = mk(10), mk(20)
!     f1(), f2()                              ->  10, 20   always correct
!     f2.__closure__[0].cell_contents         ->  10       was wrong
!     f1.__closure__[0] is f2.__closure__[0]  ->  True     was wrong
!
! Only the REFLECTION was ever affected -- calling the closures always gave
! CPython's answers, because the body reads the binding directly rather than
! going through the cell.  That is what made it the quiet kind of wrong: a
! plausible number, from a different call, with nothing raised.
!
! THE CAUSE WAS STORAGE, NOT CONSTRUCTION.  The def-time stamp writes through
! ExecBlockAttrs>>staticSlotAt:attr:put:, which is keyed by def SITE and skips a
! repeat write -- right for __name__ and __code__, which every evaluation of a
! def produces identically, and wrong for cells, which capture one activation.
! The cells were being built correctly every time and then discarded.
!
! WHY THIS WAS PREVIOUSLY WRITTEN OFF, and why that was wrong.  The obvious fix
! is to store the cells per FUNCTION OBJECT, and staticSlotTable's own comment
! rules that out: the per-object table holds its keys strongly, this GemStone
! has no weak-keyed collection, and the measured result of per-object def-time
! storage was ``VM temporary object memory is full'' at ~100k def evaluations.
! That reasoning is sound and the conclusion drawn from it -- "so this needs
! weak storage" -- was not, because it assumed the per-activation state had to
! be stored at all.  IT IS ALREADY ON THE FUNCTION OBJECT: ``aBlock staticLink''
! is the enclosing activation's VariableContext.  Nothing needs retaining, and
! the def-site table gets SMALLER rather than larger.
!
! HOW THE SLOT IS FOUND.  The def-time stamp emits ``PyCell reader: [x]'', a
! block whose only temp is the free variable -- so the block's own method NAMES
! it and GsNMethod>>_argsAndTempsOffsets says where it lives.  That encoding is
! documented on the method: low 8 bits are the number of VariableContext>>parent
! hops to the defining context, high bits a signed offset*256, positive when the
! variable is in a context rather than on the stack.  GsProcess>>_frameContentsAt:
! is the kernel's own reader of the same encoding and this walks it identically.
! Verified across one, two and three lexical levels and with several free
! variables before any of it was written.
!
! IT FALLS BACK RATHER THAN GUESSING.  A reader whose shape is not the one the
! stamp emits -- no reader, more than one temp, a stack-allocated variable, a
! context walk that runs off the end -- answers the stored cells, i.e. the old
! behaviour.  Correct where it can be proved, unchanged where it cannot.
!
! MEMOISED PER FUNCTION OBJECT, but only once __closure__ has actually been
! READ.  CPython's cells are identical across reads and test_scope compares them
! with ``is'', so a fresh tuple per read would have broken tests that already
! pass.  That does retain the function -- but only for functions somebody
! reflected on, which is a vanishing fraction of the defs a session evaluates,
! as against def-time storage which would retain every closure ever created.
!
! THE CELL BECAME WRITABLE, which it had never been.  ``c.cell_contents = 9''
! writes the binding the defining scope and every sibling closure read, and
! deleting it writes nil, which UNBINDS the variable so the next read raises.
! PyCell>>__delattr__ used to refuse on the ground that "Grail cannot unbind a
! Smalltalk temp"; that was simply false -- VariableContext>>_at:put: writes the
! slot (the public at:put: is deliberately shouldNotImplement) and a
! Grail-compiled read of an unassigned local already raises on nil.
!
! TWO DIFFERENCES THIS DOES NOT CLOSE, neither asserted by the fixture:
!
!   * ``f.__closure__ is f.__closure__'' is True in CPython, which stores the
!     tuple, and False here: ExecBlock>>__closure__ wraps the cells in a fresh
!     tuple on every read.  The CELLS are identical, which is what code compares
!     and what the fixture checks.  ExecBlock.gs is filed as SHARED SystemUser
!     methods by install_base.sh on a legacy 3.7 kernel, so the wrap is out of
!     reach from a per-user install.
!   * Reading a variable whose cell has been emptied is NameError in CPython and
!     UnboundLocalError in Grail.  UnboundLocalError is a SUBCLASS of NameError,
!     so ``assertRaises(NameError)'' -- what test_funcattrs actually asserts --
!     is satisfied either way; the fixture checks the isinstance rather than
!     pinning a name this change does not touch.
!
! Drives tests/python/closure_cells_per_activation.py, whose EXPECTED table was
! generated by RUNNING CPython 3.14.6 and self-verifies against it.  Closes
! test_funcattrs' test_comparison and test_set_cell.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClosureCellsPerActivationTestCase removeAllMethods.
ClosureCellsPerActivationTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClosureCellsPerActivationTestCase
setUp
	"Reload tests/python/closure_cells_per_activation.py fresh each test.  The
	module body runs every probe at import, and several of them WRITE the
	bindings their cells reach -- so a shared instance would let one test read
	what another test assigned."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'closure_cells_per_activation' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/closure_cells_per_activation.py')
		name: 'closure_cells_per_activation'.
%

category: 'Grail-Private'
method: ClosureCellsPerActivationTestCase
assertMatchesCPythonAt: key
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.
%

category: 'Grail-Tests - One Cell Per Activation'
method: ClosureCellsPerActivationTestCase
testEachCallReportsItsOwnValue
	"THE TEST THIS EXISTS FOR.  ``mk(10)'' and ``mk(20)'' close over two
	different bindings, and each function's cell has to report its own."

	self assertMatchesCPythonAt: 'each_call_reports_its_own_value'.
	self assertMatchesCPythonAt: 'two_activations_get_two_cells'.
%

category: 'Grail-Tests - One Cell Per Activation'
method: ClosureCellsPerActivationTestCase
testCallingThemStillAgrees
	"The control, and the half that was NEVER broken: the closures themselves
	always answered CPython's values.  If a change to the cells ever makes these
	disagree with the values above, it broke the closure rather than the
	reflection."

	self assertMatchesCPythonAt: 'calling_them_always_agreed'.
%

category: 'Grail-Tests - One Cell Per Activation'
method: ClosureCellsPerActivationTestCase
testTheSameFunctionGivesTheSameCell
	"Building on demand must not mean building a NEW cell per read: test_scope
	compares cells with ``is'' and passes today.  Hence the per-object memo,
	taken only once __closure__ has actually been read."

	self assertMatchesCPythonAt: 'the_same_function_gives_the_same_cell'.
%

category: 'Grail-Tests - One Cell Per Activation'
method: ClosureCellsPerActivationTestCase
testAFunctionThatClosesOverNothingHasNoClosure
	"None, not an empty tuple -- and the guard that the on-demand path does not
	invent a closure for a def that has none."

	self assertMatchesCPythonAt: 'no_free_variables_means_no_closure'.
%

category: 'Grail-Tests - Shapes The Decode Has To Handle'
method: ClosureCellsPerActivationTestCase
testSeveralFreeVariablesKeepTheirOrder
	"Two free variables land in two slots of one context, and __closure__ is
	ordered by name as CPython orders it by co_freevars."

	self assertMatchesCPythonAt: 'two_free_variables_keep_their_order'.
%

category: 'Grail-Tests - Shapes The Decode Has To Handle'
method: ClosureCellsPerActivationTestCase
testAVariableTwoLevelsUp
	"The case that decides whether the offset decode is real: L3 closes over one
	variable from its immediate enclosing scope and one from two levels up, so
	the lexical-level bits have to be walked rather than assumed zero.  Two
	independent chains are built, because a decode that ignored the level would
	still look right with only one."

	self assertMatchesCPythonAt: 'a_variable_two_levels_up'.
%

category: 'Grail-Tests - Shapes The Decode Has To Handle'
method: ClosureCellsPerActivationTestCase
testDefaultsDoNotDisplaceTheClosure
	"THE SHAPE THAT BROKE THIS ONCE ALREADY, and the reason this category
	exists at all.

	A def with DEFAULTS is emitted inside an extra block holding the evaluated
	defaults, and the ___pyClosure___: cascade is emitted OUTSIDE that block --
	so the function's staticLink is the WRAPPER's context while its cells were
	built one level further out.  The first version of this walk started at the
	function and landed on the defaults: ``f.__closure__[0].cell_contents''
	answered 1, the default for the first parameter, instead of the captured
	variable.  Silently, and with a value of an entirely unrelated kind, which
	is worse than the staleness it replaced.

	The gap that let it through was in the TESTS: closures and defaults were
	each covered, separately, and ``def f(a=1): return a, x'' is ordinary code
	that needs both.

	The fix measures the distance rather than assuming zero, and measures it at
	the one moment the function and its cells are known to share an activation
	-- see ExecBlockAttrs class>>___closureBaseDepthFrom___:cells:."

	self assertMatchesCPythonAt: 'defaults_do_not_displace_the_closure'.
	self assertMatchesCPythonAt: 'several_defaults_and_several_free_variables'.
%

category: 'Grail-Tests - Shapes The Decode Has To Handle'
method: ClosureCellsPerActivationTestCase
testTheDefaultsThemselvesStillWork
	"The control for the test above: a walk that reaches PAST the defaults must
	not lose them.  Calling the function with none, one and both arguments
	supplied still binds what the def declared."

	self assertMatchesCPythonAt: 'the_defaults_still_work'.
%

category: 'Grail-Tests - The Cell Is Live Both Ways'
method: ClosureCellsPerActivationTestCase
testALaterAssignmentShowsThrough
	"A cell tracks its binding rather than snapshotting it: one cell object read
	either side of an assignment reports both values."

	self assertMatchesCPythonAt: 'a_later_assignment_shows_through'.
%

category: 'Grail-Tests - The Cell Is Live Both Ways'
method: ClosureCellsPerActivationTestCase
testWritingTheCellWritesTheBinding
	"``c.cell_contents = 9'' reaches the variable itself, so the function AND
	the defining scope both see 9.  A closure cell was read-only before --
	``readonly attribute'' -- because the def-time stamp emits a reader with no
	writer; the on-demand cell addresses the context slot directly and so has
	both."

	self assertMatchesCPythonAt: 'writing_the_cell_writes_the_binding'.
%

category: 'Grail-Tests - The Cell Is Live Both Ways'
method: ClosureCellsPerActivationTestCase
testDeletingTheCellUnbindsTheVariable
	"``del c.cell_contents'' empties the cell AND unbinds the variable, so
	reading the cell is a ValueError and calling the function raises a
	NameError.  PyCell>>__delattr__ refused this outright, on the stated ground
	that Grail could not unbind a Smalltalk temp -- which was false."

	self assertMatchesCPythonAt: 'deleting_the_cell_unbinds_the_variable'.
%
