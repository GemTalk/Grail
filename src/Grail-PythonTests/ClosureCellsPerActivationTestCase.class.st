Class {
	#name : 'ClosureCellsPerActivationTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClosureCellsPerActivationTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
ClosureCellsPerActivationTestCase >> setUp [
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

]

{ #category : 'Grail-Tests - One Cell Per Activation' }
ClosureCellsPerActivationTestCase >> testAFunctionThatClosesOverNothingHasNoClosure [
	"None, not an empty tuple -- and the guard that the on-demand path does not
	invent a closure for a def that has none."

	self assertMatchesCPythonAt: 'no_free_variables_means_no_closure'.

]

{ #category : 'Grail-Tests - The Cell Is Live Both Ways' }
ClosureCellsPerActivationTestCase >> testALaterAssignmentShowsThrough [
	"A cell tracks its binding rather than snapshotting it: one cell object read
	either side of an assignment reports both values."

	self assertMatchesCPythonAt: 'a_later_assignment_shows_through'.

]

{ #category : 'Grail-Tests - Shapes The Decode Has To Handle' }
ClosureCellsPerActivationTestCase >> testAVariableTwoLevelsUp [
	"The case that decides whether the offset decode is real: L3 closes over one
	variable from its immediate enclosing scope and one from two levels up, so
	the lexical-level bits have to be walked rather than assumed zero.  Two
	independent chains are built, because a decode that ignored the level would
	still look right with only one."

	self assertMatchesCPythonAt: 'a_variable_two_levels_up'.

]

{ #category : 'Grail-Tests - One Cell Per Activation' }
ClosureCellsPerActivationTestCase >> testCallingThemStillAgrees [
	"The control, and the half that was NEVER broken: the closures themselves
	always answered CPython's values.  If a change to the cells ever makes these
	disagree with the values above, it broke the closure rather than the
	reflection."

	self assertMatchesCPythonAt: 'calling_them_always_agreed'.

]

{ #category : 'Grail-Tests - Shapes The Decode Has To Handle' }
ClosureCellsPerActivationTestCase >> testDefaultsDoNotDisplaceTheClosure [
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

]

{ #category : 'Grail-Tests - The Cell Is Live Both Ways' }
ClosureCellsPerActivationTestCase >> testDeletingTheCellUnbindsTheVariable [
	"``del c.cell_contents'' empties the cell AND unbinds the variable, so
	reading the cell is a ValueError and calling the function raises a
	NameError.  PyCell>>__delattr__ refused this outright, on the stated ground
	that Grail could not unbind a Smalltalk temp -- which was false."

	self assertMatchesCPythonAt: 'deleting_the_cell_unbinds_the_variable'.

]

{ #category : 'Grail-Tests - One Cell Per Activation' }
ClosureCellsPerActivationTestCase >> testEachCallReportsItsOwnValue [
	"THE TEST THIS EXISTS FOR.  ``mk(10)'' and ``mk(20)'' close over two
	different bindings, and each function's cell has to report its own."

	self assertMatchesCPythonAt: 'each_call_reports_its_own_value'.
	self assertMatchesCPythonAt: 'two_activations_get_two_cells'.

]

{ #category : 'Grail-Tests - Shapes The Decode Has To Handle' }
ClosureCellsPerActivationTestCase >> testSeveralFreeVariablesKeepTheirOrder [
	"Two free variables land in two slots of one context, and __closure__ is
	ordered by name as CPython orders it by co_freevars."

	self assertMatchesCPythonAt: 'two_free_variables_keep_their_order'.

]

{ #category : 'Grail-Tests - Shapes The Decode Has To Handle' }
ClosureCellsPerActivationTestCase >> testTheDefaultsThemselvesStillWork [
	"The control for the test above: a walk that reaches PAST the defaults must
	not lose them.  Calling the function with none, one and both arguments
	supplied still binds what the def declared."

	self assertMatchesCPythonAt: 'the_defaults_still_work'.

]

{ #category : 'Grail-Tests - One Cell Per Activation' }
ClosureCellsPerActivationTestCase >> testTheSameFunctionGivesTheSameCell [
	"Building on demand must not mean building a NEW cell per read: test_scope
	compares cells with ``is'' and passes today.  Hence the per-object memo,
	taken only once __closure__ has actually been read."

	self assertMatchesCPythonAt: 'the_same_function_gives_the_same_cell'.

]

{ #category : 'Grail-Tests - The Cell Is Live Both Ways' }
ClosureCellsPerActivationTestCase >> testWritingTheCellWritesTheBinding [
	"``c.cell_contents = 9'' reaches the variable itself, so the function AND
	the defining scope both see 9.  A closure cell was read-only before --
	``readonly attribute'' -- because the def-time stamp emits a reader with no
	writer; the on-demand cell addresses the context slot directly and so has
	both."

	self assertMatchesCPythonAt: 'writing_the_cell_writes_the_binding'.

]
