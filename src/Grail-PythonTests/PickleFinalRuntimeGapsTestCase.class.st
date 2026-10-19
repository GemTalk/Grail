Class {
	#name : 'PickleFinalRuntimeGapsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
PickleFinalRuntimeGapsTestCase >> assertMatchesCPythonAt: key [
	"Every recorded answer is already a repr string, so the two compare as text."

	| actual expected |
	actual := (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key.
	expected := (testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key.
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
PickleFinalRuntimeGapsTestCase >> setUp [
	"Reload tests/python/pickle_final_runtime_gaps.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pickle_final_runtime_gaps' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pickle_final_runtime_gaps.py')
		name: 'pickle_final_runtime_gaps'.

]

{ #category : 'Grail-Tests' }
PickleFinalRuntimeGapsTestCase >> testImportCycleAcrossThreadsDoesNotDeadlock [
	"Two threads importing modules that import each other both finish, as in
	CPython, which answers the partial module rather than deadlocking."

	self assertMatchesCPythonAt: 'import_cycle_across_threads'.

]

{ #category : 'Grail-Tests' }
PickleFinalRuntimeGapsTestCase >> testIntNewKeywordAndClassFirstForms [
	"``int.__new__(S, 'FACE', base=16)'', ``S('FACE', base=16)'', three
	positionals, and CPython's refusals for bool and a non-int class."

	self assertMatchesCPythonAt: 'int_new_forms'.
	self assertMatchesCPythonAt: 'int_new_refusals'.

]

{ #category : 'Grail-Tests' }
PickleFinalRuntimeGapsTestCase >> testKwargsSplatErrorNamesTheCallee [
	"``functools.partial() argument after ** must be a mapping, not list'': a
	NAME callee is handed to the mapping check; ``*'' keeps CPython's
	``Value after *'' wording where CPython has it."

	self assertMatchesCPythonAt: 'kwargs_splat_callee'.
	self assertMatchesCPythonAt: 'star_messages'.

]

{ #category : 'Grail-Tests' }
PickleFinalRuntimeGapsTestCase >> testNewobjExRoundTripsEveryProtocol [
	"An int subclass with __getnewargs_ex__ round-trips at every protocol --
	including below 4, where pickle saves partial(cls.__new__, cls, ...), and
	from a generator expression in the module's own body."

	self assertMatchesCPythonAt: 'newobj_ex_round_trips'.

]

{ #category : 'Grail-Tests' }
PickleFinalRuntimeGapsTestCase >> testSecondThreadWaitsForTheImport [
	"Two threads unpickling a class from a module whose body is blocked: both
	get the class (test_pickle test_unpickle_module_race)."

	self assertMatchesCPythonAt: 'import_race'.

]

{ #category : 'Grail-Tests' }
PickleFinalRuntimeGapsTestCase >> testShiftPastTheIntegerCeilingIsCatchable [
	"``n << 1000000'' is past GemStone's ~130144-bit LargeInteger ceiling (a VM
	limit, which is why test_pickle's test_long is skipped).  It raised an
	uncatchable NumericError; it is now a catchable OverflowError.  Grail-only:
	CPython has no ceiling, so the fixture records this rather than comparing."

	self
		assert: (((testModule @env1:___pyAttrLoad___: #'grail_only')
			@env1:__getitem__: 'huge_shift') asString)
		equals: 'OverflowError: result exceeds Grail integer capacity'.

]

{ #category : 'Grail-Tests' }
PickleFinalRuntimeGapsTestCase >> testSubclassNewIsTheBuiltinNew [
	"``S.__new__ is int.__new__'' (and tuple, str, dict, ...) for a Python
	subclass that does not define __new__; one that does keeps its own."

	self assertMatchesCPythonAt: 'sub_new_is_builtin_new'.
	self assertMatchesCPythonAt: 'own_new_is_own'.

]
