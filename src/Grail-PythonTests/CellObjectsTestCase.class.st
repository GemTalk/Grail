Class {
	#name : 'CellObjectsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CellObjectsTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
CellObjectsTestCase >> setUp [
	"Reload tests/python/cell_objects.py fresh each test -- the module body
	MUTATES the cells it builds (contents assigned, deleted and refilled), so a
	shared instance would be reading a previous test's edits."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'cell_objects' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/cell_objects.py')
		name: 'cell_objects'.

]

{ #category : 'Grail-Tests - The Types Have Names' }
CellObjectsTestCase >> testACellIsAnInstanceOfCellType [
	"THE TEST THIS EXISTS FOR.  isinstance(c, types.CellType) was False about a
	genuine closure cell, which is the first thing any closure-inspecting code
	asks."

	self assertMatchesCPythonAt: 'cell_isinstance'.
	self assertMatchesCPythonAt: 'cell_type_is'.
	self assertMatchesCPythonAt: 'cell_type_name'.
	self assertMatchesCPythonAt: 'cell_type_module'.

]

{ #category : 'Grail-Tests - The Types Have Names' }
CellObjectsTestCase >> testACodeObjectIsAnInstanceOfCodeType [
	"``type(f.__code__)'' printed <class 'PyCode'> -- Grail's internal spelling
	leaking into every repr.  test_funcattrs' test___code__ compares the type
	against types.CodeType directly."

	self assertMatchesCPythonAt: 'code_isinstance'.
	self assertMatchesCPythonAt: 'code_type_is'.
	self assertMatchesCPythonAt: 'code_type_name'.
	self assertMatchesCPythonAt: 'code_type_module'.

]

{ #category : 'Grail-Tests - Constructing A Cell' }
CellObjectsTestCase >> testAnEmptyCellRaisesRatherThanAnswering [
	"``types.CellType()'' is EMPTY, and reading it is a ValueError -- not None.
	The distinction is why emptiness is a dedicated marker object rather than
	nil: ``types.CellType(None)'' is a FULL cell whose contents are None, and the
	two must not collapse."

	self assertMatchesCPythonAt: 'ctor_empty_reads'.
	self assertMatchesCPythonAt: 'ctor_none_is_not_empty'.

]

{ #category : 'Grail-Tests - Comparison' }
CellObjectsTestCase >> testAnEmptyCellSortsBeforeEveryFilledOne [
	"The one ordering rule that is cell-specific rather than delegated, and the
	reason the comparisons cannot simply forward to cell_contents: reading an
	empty cell raises."

	self assertMatchesCPythonAt: 'empty_lt_filled'.
	self assertMatchesCPythonAt: 'filled_gt_empty'.
	self assertMatchesCPythonAt: 'empty_eq_empty'.

]

{ #category : 'Grail-Tests - Comparison' }
CellObjectsTestCase >> testCellsCompareByTheirContents [
	"CPython's cell_richcompare defers entirely to the contents, which is why
	``cell(-36) == cell(-36.0)'' is true: that is int/float equality, nothing
	cell-specific."

	self assertMatchesCPythonAt: 'lt_by_contents'.
	self assertMatchesCPythonAt: 'gt_by_contents'.
	self assertMatchesCPythonAt: 'ne_by_contents'.
	self assertMatchesCPythonAt: 'eq_across_numeric_types'.

]

{ #category : 'Grail-Tests - Constructing A Cell' }
CellObjectsTestCase >> testCellTypeIsCallable [
	"types.CellType(v) is the standard way to build a cell; the stub class was
	not callable into anything useful, so this raised or answered an object with
	no cell_contents."

	self assertMatchesCPythonAt: 'ctor_value'.
	self assertMatchesCPythonAt: 'ctor_isinstance'.

]

{ #category : 'Grail-Tests - Writing And Clearing' }
CellObjectsTestCase >> testClearingAndRefillingAStandaloneCell [
	"``del c.cell_contents'' empties it, so the next read raises; assigning again
	refills it.  Standalone cells only -- see this class's comment for why a
	CLOSURE cell refuses the delete instead."

	self assertMatchesCPythonAt: 'del_then_read'.
	self assertMatchesCPythonAt: 'refill_after_del'.

]

{ #category : 'Grail-Tests - Comparison' }
CellObjectsTestCase >> testTheDerivedComparisonsAgree [
	"__le__ / __ge__ are built from __gt__ / __lt__, so they need their own check
	that the negation is the right way round."

	self assertMatchesCPythonAt: 'le_equal'.
	self assertMatchesCPythonAt: 'ge_equal'.

]

{ #category : 'Grail-Tests - Writing And Clearing' }
CellObjectsTestCase >> testWritingCellContents [
	"``c.cell_contents = v''.  Without PyCell>>__setattr__ this fell through to
	the generic object path and created a DYNAMIC INSTVAR shadowing the accessor,
	so the write appeared to succeed and the next read still answered the old
	value -- test_funcattrs' test_set_cell saw ``12 != 9''."

	self assertMatchesCPythonAt: 'set_contents'.

]
