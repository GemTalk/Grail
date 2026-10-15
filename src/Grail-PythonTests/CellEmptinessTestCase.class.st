Class {
	#name : 'CellEmptinessTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CellEmptinessTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
CellEmptinessTestCase >> setUp [
	"Reload tests/python/cell_emptiness.py fresh each test.  The module body runs
	every probe at import, and each probe assigns the binding its cell closes
	over before returning -- so a shared instance would let one test see another
	test's filled cell."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'cell_emptiness' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/cell_emptiness.py')
		name: 'cell_emptiness'.

]

{ #category : 'Grail-Tests - The Standalone Cell Still Works' }
CellEmptinessTestCase >> testAStandaloneCellIsStillEmptyItsOwnWay [
	"``types.CellType()'' is empty by holding the private marker, not by having
	an unassigned binding -- a different route to the same answer, and the
	regression guard for routing all three through one read.  And None is a
	VALUE a cell may hold, which CPython tells apart from empty."

	self assertMatchesCPythonAt: 'standalone_empty'.
	self assertMatchesCPythonAt: 'standalone_holding_none'.

]

{ #category : 'Grail-Tests - Comparisons Decide Emptiness First' }
CellEmptinessTestCase >> testEmptySortsBeforeEveryFilledCell [
	"CPython's cell_richcompare puts an empty cell before every filled one and
	otherwise defers entirely to the contents.  Every one of those paths asks
	___isEmpty___ first, so all six comparisons raised on an unassigned
	binding."

	self assertMatchesCPythonAt: 'empty_equals_empty'.
	self assertMatchesCPythonAt: 'empty_sorts_before_filled'.

]

{ #category : 'Grail-Tests - Comparisons Decide Emptiness First' }
CellEmptinessTestCase >> testFilledCellsCompareByTheirContents [
	"The other half of the rule, and the guard against a fix that reports
	everything empty: two filled cells compare as their contents do, including
	``cell(-36) == cell(-36.0)'', which is ordinary numeric equality and nothing
	cell-specific."

	self assertMatchesCPythonAt: 'filled_cells_compare_by_contents'.
	self assertMatchesCPythonAt: 'int_and_float_cells_are_equal'.

]

{ #category : 'Grail-Tests - Reading An Empty Cell' }
CellEmptinessTestCase >> testReadingAnUnassignedClosureCellIsAValueError [
	"THE TEST THIS EXISTS FOR.  CPython raises ValueError('Cell is empty');
	Grail let the reader's own UnboundLocalError escape, so the caller saw the
	error of the BINDING rather than the error of the CELL -- and an ``except
	ValueError'' around it, which is how the empty case is written, did not
	catch."

	self assertMatchesCPythonAt: 'read_before_assignment'.
	self assertMatchesCPythonAt: 'read_after_assignment'.

]

{ #category : 'Grail-Tests - Reading An Empty Cell' }
CellEmptinessTestCase >> testTheReprSaysEmptyAndDoesNotRaise [
	"A repr must never raise, and this one did -- for exactly the cells whose
	repr is the interesting one."

	self assertMatchesCPythonAt: 'repr_does_not_raise'.

]

{ #category : 'Grail-Tests - Reading An Empty Cell' }
CellEmptinessTestCase >> testTheSameCellFillsIn [
	"Emptiness is a question about NOW.  One cell object, read either side of
	the assignment: empty, then filled.  A cell tracks its binding rather than
	snapshotting it, which is why the answer cannot be settled when the cell is
	built."

	self assertMatchesCPythonAt: 'the_same_cell_fills_in'.

]
