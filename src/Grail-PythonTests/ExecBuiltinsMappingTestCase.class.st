Class {
	#name : 'ExecBuiltinsMappingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ExecBuiltinsMappingTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
ExecBuiltinsMappingTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exec_builtins_mapping' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_builtins_mapping.py')
		name: 'exec_builtins_mapping'.

]

{ #category : 'Grail-Tests - the compile-time half' }
ExecBuiltinsMappingTestCase >> testACompileTimeBoundBuiltinIsGatedToo [
	"A call to a name Grail binds while compiling never reaches the runtime
	resolver, so print() under an empty __builtins__ PRINTED.  The last row is
	the one that proves the gate routes rather than merely refuses: a
	SUBSTITUTED print is the one that gets called."

	self assertMatchesCPythonAt: 'print_call_gated'.
	self assertMatchesCPythonAt: 'len_call_gated'.
	self assertMatchesCPythonAt: 'print_substituted'.

]

{ #category : 'Grail-Tests - the override is consulted' }
ExecBuiltinsMappingTestCase >> testANameResolvesThroughTheSuppliedMapping [
	"Three mapping shapes, because the callers are deliberately exotic and the
	only thing they agree on is that a name can be subscripted out of them."

	self assertMatchesCPythonAt: 'found_in_dict'.
	self assertMatchesCPythonAt: 'found_in_subclass'.
	self assertMatchesCPythonAt: 'found_in_proxy'.

]

{ #category : 'Grail-Tests - error shapes' }
ExecBuiltinsMappingTestCase >> testANonMappingIsLazyNotEager [
	"CPython does not check the type at exec() time.  Source that never asks
	builtins for a name RUNS TO COMPLETION with __builtins__ = 123, and source
	that does gets whatever subscripting that object raises -- three different
	messages for an int, a str and a list.  An eager check would raise where
	CPython does not and replace three accurate messages with one invented
	one."

	self assertMatchesCPythonAt: 'nonmapping_unused'.
	self assertMatchesCPythonAt: 'nonmapping_int'.
	self assertMatchesCPythonAt: 'nonmapping_none'.

]

{ #category : 'Grail-Tests' }
ExecBuiltinsMappingTestCase >> testBuiltinsHoldsTheModuleDunders [
	"builtins.__dict__ holds __name__, __doc__, __package__ and __loader__ as
	CPython's does, and a lookup that falls through to builtins finds them:
	``eval('__name__', {})'' is 'builtins', and a snippet run with
	``exec(src, {})'' that tests ``if __name__ == '__main__':'' reads it
	instead of raising NameError (#1527).  tests/python/builtins_dict_dunders.py
	holds the checks, agreeing with CPython 3.14 except the pinned __loader__
	(Grail has no BuiltinImporter)."

	| fixture |
	importlib @env1:modules removeKey: #'builtins_dict_dunders' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtins_dict_dunders.py')
		name: 'builtins_dict_dunders'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
ExecBuiltinsMappingTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '19 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - the key is inserted' }
ExecBuiltinsMappingTestCase >> testExecAndEvalInsertTheRealBuiltins [
	"exec() and eval() insert builtins.__dict__ as ``__builtins__'' into a
	supplied globals dict that lacks it, as CPython does, so
	``del ns['__builtins__']'' works (#1507); a supplied key is kept, and the
	inserted one is no override -- builtins still resolve, and an empty
	mapping still restricts.  tests/python/exec_inserts_builtins.py holds the
	checks and agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'exec_inserts_builtins' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_inserts_builtins.py')
		name: 'exec_inserts_builtins'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '10 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
ExecBuiltinsMappingTestCase >> testNothingWithoutAnOverrideChanges [
	"THE CONTROL for the compile-time gate, which is the risky half: it
	suppresses Grail's builtin fast paths, so it must fire ONLY under an
	override.  An exec with no __builtins__ keeps every fast path, the caller
	keeps its own builtins afterwards, and a NESTED exec that strips them must
	not strip the outer one's."

	self assertMatchesCPythonAt: 'no_override_builtin'.
	self assertMatchesCPythonAt: 'no_override_print'.
	self assertMatchesCPythonAt: 'restored_after'.
	self assertMatchesCPythonAt: 'nested_exec_restores'.
	self assertMatchesCPythonAt: 'module_scope_unaffected'.

]

{ #category : 'Grail-Tests - error shapes' }
ExecBuiltinsMappingTestCase >> testOnlyKeyErrorMeansNoSuchName [
	"A mapping whose __getitem__ raises something else is saying something,
	and absorbing it would report a NameError about the wrong thing."

	self assertMatchesCPythonAt: 'getitem_raises'.

]

{ #category : 'Grail-Tests - the override is consulted' }
ExecBuiltinsMappingTestCase >> testTheRealBuiltinsAreNotConsultedAfterAMiss [
	"The row that makes the choice EXCLUSIVE rather than additive.  ``len''
	exists in the real builtins, and under an empty override it must not:
	falling through would hand back exactly the name the caller took away."

	self assertMatchesCPythonAt: 'missing_in_dict'.
	self assertMatchesCPythonAt: 'missing_in_subclass'.
	self assertMatchesCPythonAt: 'missing_in_proxy'.
	self assertMatchesCPythonAt: 'real_builtin_is_gone'.

]
