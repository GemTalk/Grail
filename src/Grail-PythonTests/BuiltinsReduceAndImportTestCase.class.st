Class {
	#name : 'BuiltinsReduceAndImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BuiltinsReduceAndImportTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
BuiltinsReduceAndImportTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'builtins_reduce_and_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtins_reduce_and_import.py')
		name: 'builtins_reduce_and_import'.

]

{ #category : 'Grail-Tests - iterator reduce' }
BuiltinsReduceAndImportTestCase >> testAListIteratorReduces [
	"It had no __reduce__ and inherited NotImplemented.  The three states are
	distinct shapes, not one shape with different numbers in it."

	self assertMatchesCPythonAt: 'fresh'.
	self assertMatchesCPythonAt: 'partial'.
	self assertMatchesCPythonAt: 'spent'.
	self assertMatchesCPythonAt: 'spent_has_no_index'.

]

{ #category : 'Grail-Tests - iterator reduce' }
BuiltinsReduceAndImportTestCase >> testAnIteratorRoundTripsThroughPickle [
	"What __reduce__ is for.  A half-consumed iterator resumes where it left
	off, which is the property the state slot exists to carry."

	self assertMatchesCPythonAt: 'pickle_fresh'.
	self assertMatchesCPythonAt: 'pickle_partial'.

]

{ #category : 'Grail-Tests - iterator reduce' }
BuiltinsReduceAndImportTestCase >> testAReverseIteratorNamesReversed [
	"By identity, not by repr: CPython's reversed is a class and Grail's is a
	builtin function.  What must agree is WHICH callable and what state rides
	with it."

	self assertMatchesCPythonAt: 'reversed_callable'.
	self assertMatchesCPythonAt: 'reversed_state'.
	self assertMatchesCPythonAt: 'reversed_after_one'.
	self assertMatchesCPythonAt: 'forward_callable'.

]

{ #category : 'Grail-Tests - Controls' }
BuiltinsReduceAndImportTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '20 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - resolved in the code\'s builtins' }
BuiltinsReduceAndImportTestCase >> testImportIsGatedTheSameWay [
	"Both emit sites -- plain ``import'' and ``from X import y''.  The middle
	row is the one that pins the ARGUMENTS: a custom __import__ receives the
	mappings exec() was given, compared by identity."

	self assertMatchesCPythonAt: 'import_no_builtins'.
	self assertMatchesCPythonAt: 'import_custom_called'.
	self assertMatchesCPythonAt: 'import_from_gated'.

]

{ #category : 'Grail-Tests - Controls' }
BuiltinsReduceAndImportTestCase >> testOnlyAnImportTheSourceWroteIsGated [
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

]

{ #category : 'Grail-Tests - resolved in the code\'s builtins' }
BuiltinsReduceAndImportTestCase >> testTheReduceCallableComesFromTheCodesBuiltins [
	"Not from the real builtins: an empty __builtins__ makes __reduce__ raise
	AttributeError for the bare name."

	self assertMatchesCPythonAt: 'reduce_no_builtins'.
	self assertMatchesCPythonAt: 'reduce_iter_supplied'.

]
