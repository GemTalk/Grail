Class {
	#name : 'CoConstsAndShadowedTypeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CoConstsAndShadowedTypeTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
CoConstsAndShadowedTypeTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'co_consts_and_shadowed_type' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/co_consts_and_shadowed_type.py')
		name: 'co_consts_and_shadowed_type'.

]

{ #category : 'Grail-Tests - Controls' }
CoConstsAndShadowedTypeTestCase >> testAnUnshadowedCallIsUndisturbed [
	"The probe is emitted only inside a user module and only for a name that
	could be shadowed; every ordinary class call must behave exactly as
	before, and the restored builtins must be the real ones."

	self assertMatchesCPythonAt: 'unshadowed_tuple'.
	self assertMatchesCPythonAt: 'unshadowed_all'.
	self assertMatchesCPythonAt: 'tuple_is_a_type'.
	self assertMatchesCPythonAt: 'str_call'.
	self assertMatchesCPythonAt: 'int_call'.
	self assertMatchesCPythonAt: 'genexp_still_runs'.

]

{ #category : 'Grail-Tests - a shadowed type' }
CoConstsAndShadowedTypeTestCase >> testAShadowedBuiltinTypeIsShadowed [
	"THE THREE TOGETHER, deliberately.  Each call on its own looks
	reasonable -- a tuple is what tuple() should answer -- and it is the
	comparison of three answers that shows the class-call fast path was the
	one not probing the module globals."

	self assertMatchesCPythonAt: 'module_shadow'.
	self assertMatchesCPythonAt: 'builtins_shadow'.

]

{ #category : 'Grail-Tests - Controls' }
CoConstsAndShadowedTypeTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '20 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - co_consts' }
CoConstsAndShadowedTypeTestCase >> testOnlyTheScopesCPythonGivesOneGetOne [
	"The rule changed in 3.12 and counting every comprehension would answer
	three where CPython answers none -- a confident wrong number rather than
	an obvious missing one.  All eight shapes are measured, not reasoned
	about."

	self assertMatchesCPythonAt: 'genexp'.
	self assertMatchesCPythonAt: 'listcomp'.
	self assertMatchesCPythonAt: 'setcomp'.
	self assertMatchesCPythonAt: 'dictcomp'.
	self assertMatchesCPythonAt: 'two_genexps'.
	self assertMatchesCPythonAt: 'nested_def'.
	self assertMatchesCPythonAt: 'lambda'.
	self assertMatchesCPythonAt: 'nothing'.

]

{ #category : 'Grail-Tests - co_consts' }
CoConstsAndShadowedTypeTestCase >> testTheCodeObjectsAreNamedAndTupled [
	"co_consts is a TUPLE, and each entry carries the co_name CPython gives
	it: ``<genexpr>'', ``<lambda>'', or the def's own name."

	self assertMatchesCPythonAt: 'consts_is_a_tuple'.
	self assertMatchesCPythonAt: 'genexp_name'.
	self assertMatchesCPythonAt: 'nested_def_name'.
	self assertMatchesCPythonAt: 'lambda_name'.

]
