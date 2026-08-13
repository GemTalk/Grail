! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClosureCellTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClosureCellTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClosureCellTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClosureCellTestCase
!
! ``func.__closure__'' -- a tuple of cell objects, one per FREE VARIABLE of the
! def -- and the cell's ``cell_contents''.
!
! A cell is the box CPython puts a closed-over variable in so the defining scope
! and every nested function share ONE binding.  Grail has no such box: a free
! variable is read straight off the enclosing Smalltalk block's temp, which
! already gives that sharing.  What was missing was any way to NAME the binding
! as an object, so ``__closure__'' raised AttributeError.
!
! FunctionDefAst now cascades ``___pyClosure___:'' at the def site with a PyCell
! per free variable, each holding the reader/writer block pair Grail already uses
! to pass a binding by reference.  Blocks capture by reference, so cell_contents
! is LIVE (testCellContentsIsLive) rather than a snapshot.
!
! Two things about the emission are load-bearing and each has a test here:
!
!   * the free-variable READ is compiled by NameAst at the def site, not emitted
!     as the bare identifier.  The self/cls parameter of a class-body def IS
!     Smalltalk ``self'', so a bare name there is CompileError 1001 and takes the
!     whole module down -- which is what happened to fractions'
!     ``_operator_fallbacks(monomorphic_operator, ...)'', turning six modules
!     into IMPORTERROR (testFreeVariableIsTheReceiver).
!   * a name referenced only by a DEEPER nested def is free in the intermediate
!     one too, since that scope has to carry the binding down
!     (testNestedTwoLevels).
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/closure_cells.py under it directly.
!
! KNOWN DEVIATION, deliberately not asserted: CPython gives sibling closures over
! one variable the SAME cell, so ``g.__closure__[0] is h.__closure__[0]'' is true
! there and false here (Grail builds a fresh PyCell per def).  Both cells read and
! write the one underlying binding, so every VALUE observation agrees.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClosureCellTestCase removeAllMethods.
ClosureCellTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: ClosureCellTestCase
setUp
	"Reload tests/python/closure_cells.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'closure_cells' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/closure_cells.py')
		name: 'closure_cells'.
%

! --- shape of __closure__ ---

category: 'Grail-Tests - shape'
method: ClosureCellTestCase
testNoFreeVariablesAnswersNone
	"CPython answers None, not an empty tuple, for a function that closes over
	nothing -- and Grail must not raise AttributeError there either, which is
	what it did before the stamp existed."

	self assert: testModule @env1:no_free_variables.
%

category: 'Grail-Tests - shape'
method: ClosureCellTestCase
testOneCellPerFreeVariable
	"A tuple with one cell per free variable, in sorted name order.  ``b'' is a
	local of the enclosing def that the inner one never reads, so it is not a
	free variable and gets no cell."

	self assert: testModule @env1:one_cell_per_free_variable asArray
		equals: #( true 2 1 3 ).
%

category: 'Grail-Tests - shape'
method: ClosureCellTestCase
testClosureIsStableAcrossReads
	"__closure__ is stamped once at def time, so two reads answer the same
	cells rather than freshly built ones."

	self assert: testModule @env1:closure_is_stable_across_reads asArray
		equals: #( true ).
%

! --- the cell is live, and is not the value ---

category: 'Grail-Tests - cell semantics'
method: ClosureCellTestCase
testCellContentsIsLive
	"The whole point of a cell: it reports the CURRENT value of the binding, so
	an assignment made after the cell was built is visible through it.  A
	snapshot would answer 1 twice."

	self assert: testModule @env1:cell_contents_is_live asArray
		equals: #( 1 99 ).
%

category: 'Grail-Tests - cell semantics'
method: ClosureCellTestCase
testCellSurvivesTheDefiningCall
	"Reading a cell after its defining call returned still works -- the block
	holds the home context alive, which is the same reason the closure itself
	keeps working."

	self assert: testModule @env1:cell_survives_the_defining_call asArray
		equals: #( 7 7 ).
%

category: 'Grail-Tests - cell semantics'
method: ClosureCellTestCase
testCellWrapsRatherThanIsTheValue
	"The cell is a distinct object from the value it holds.  test_scope's
	testCellIsArgAndEscapes in miniature: a cell passed as an argument and
	closed over again must be wrapped in a NEW cell, so the value read back is
	the original cell and not the wrapper."

	self assert: testModule @env1:cell_wraps_rather_than_is_the_value asArray
		equals: #( true true ).
%

category: 'Grail-Tests - cell semantics'
method: ClosureCellTestCase
testCellReprShape
	"``<cell at 0x...: int object at 0x...>'', shaped like CPython's -- and the
	PYTHON type name (``int''), not the Smalltalk class (``SmallInteger'')."

	self assert: testModule @env1:cell_repr_shape asArray
		equals: #( true true true ).
%

! --- which names are free, and how they are read ---

category: 'Grail-Tests - free variables'
method: ClosureCellTestCase
testParametersAreCaptured
	"A free variable that is the enclosing function's PARAMETER gets a cell
	too.  Nothing assigns it, so the cell is read-only -- a Smalltalk block
	argument is not assignable, and emitting a writer over one would be
	CompileError 1001."

	self assert: testModule @env1:parameters_are_captured equals: 'hi'.
%

category: 'Grail-Tests - free variables'
method: ClosureCellTestCase
testNestedTwoLevels
	"A name referenced only by a DEEPER def is free in the intermediate def as
	well -- that scope has to carry the binding down to the one that reads it.
	The parser gets this by propagating each scope's unbound mentions outward
	at popScope."

	self assert: testModule @env1:nested_two_levels asArray
		equals: { 1. 'deep'. 1. 'deep' }.
%

category: 'Grail-Tests - free variables'
method: ClosureCellTestCase
testMethodClosureOverEnclosingLocal
	"A def nested inside a class-body METHOD closes over that method's locals.
	The method compiles to a real Smalltalk method rather than a block, so this
	is a different emission path from the plain nested-function case."

	self assert: testModule @env1:method_closure_over_enclosing_local asArray
		equals: #( 1 10 15 ).
%

category: 'Grail-Tests - free variables'
method: ClosureCellTestCase
testFreeVariableIsTheReceiver
	"THE REGRESSION THIS PAIR OF METHODS EXISTS FOR.  The first parameter of a
	class-body def is the receiver, and NameAst compiles a reference to it as
	Smalltalk ``self''.  Emitting the cell's reader as the bare Python name
	instead produced ``[monomorphic_operator]'' against a method with no such
	temp -- CompileError 1001, which the class-body compile turns into a stub
	that raises on call, taking fractions and the five modules importing it to
	IMPORTERROR.  Building the read through NameAst at the def site is what
	fixes it."

	self assert: testModule @env1:free_variable_is_the_receiver asArray
		equals: { 2. 'T'. 3. 1 }.
%
