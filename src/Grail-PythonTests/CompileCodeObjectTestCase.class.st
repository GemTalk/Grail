Class {
	#name : 'CompileCodeObjectTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CompileCodeObjectTestCase >> ___reprOf___: key [
	| b r |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	^ (b @env1:repr: (r @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Private' }
CompileCodeObjectTestCase >> assertMatchesCPythonAt: key [
	| b expected |
	b := builtins @env1:instance.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (self ___reprOf___: key)
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
CompileCodeObjectTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'compile_code_object' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_code_object.py')
		name: 'compile_code_object'.

]

{ #category : 'Grail-Tests - the code object' }
CompileCodeObjectTestCase >> testACodeObjectStillRuns [
	"The source it carries is what exec()/eval() run, so the round trip every
	caller in the corpus uses is unchanged -- including the mode distinction,
	which is why eval() of an ``exec''-mode object answers None rather than
	applying the single-expression rule."

	self assertMatchesCPythonAt: 'exec_a_code_object'.
	self assertMatchesCPythonAt: 'eval_a_code_object'.
	self assertMatchesCPythonAt: 'exec_mode_under_eval'.
	self assertMatchesCPythonAt: 'compile_then_exec_roundtrip'.

]

{ #category : 'Grail-Tests - the code object' }
CompileCodeObjectTestCase >> testACompileResultCarriesItsFields [
	"It was a str, so every one of these was an AttributeError."

	self assertMatchesCPythonAt: 'co_filename'.
	self assertMatchesCPythonAt: 'co_name'.
	self assertMatchesCPythonAt: 'co_firstlineno'.
	self assertMatchesCPythonAt: 'co_flags_plain'.

]

{ #category : 'Grail-Tests - CO_COROUTINE' }
CompileCodeObjectTestCase >> testAGenuineTopLevelAwaitCompilesAndIsMarked [
	"What used to be this file's XFAIL.  A real module-level await now
	compiles under the flag and carries CO_COROUTINE, so the row is asserted
	the same way as every other -- against CPython's own answer."

	self assertMatchesCPythonAt: 'top_level_await_parses'.

]

{ #category : 'Grail-Tests - Controls' }
CompileCodeObjectTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up, which counts
	the XFAIL separately."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '20 checks, 0 xfail, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - CO_COROUTINE' }
CompileCodeObjectTestCase >> testNothingThatMerelyLooksAsyncSetsTheBit [
	"Ten compiles -- five shapes in two modes -- and an ``async def'', which
	is the sharpest case: it CONTAINS an await, and the module defining it is
	not a coroutine.  The bit tells a caller to run the result with ``await'',
	so a false positive is a wrong instruction."

	self assertMatchesCPythonAt: 'no_coro_offenders'.
	self assertMatchesCPythonAt: 'async_def_is_not_a_coroutine'.
	self assertMatchesCPythonAt: 'async_generator_runs'.

]

{ #category : 'Grail-Tests - CO_COROUTINE' }
CompileCodeObjectTestCase >> testTheCompilerFlagsHaveCPythonsValues [
	"They are the ``flags'' argument of compile(), which validates against
	them -- so a wrong value is refused rather than ignored."

	self assertMatchesCPythonAt: 'only_ast_value'.
	self assertMatchesCPythonAt: 'top_level_await_value'.
	self assertMatchesCPythonAt: 'type_comments_value'.
	self assertMatchesCPythonAt: 'optimized_ast_value'.

]

{ #category : 'Grail-Tests - Controls' }
CompileCodeObjectTestCase >> testTheOrdinaryShapesAreUnchanged [
	"A str source through exec and eval, a bad mode, and a source that does
	not parse -- compile() answering a different KIND of object must not move
	any of them."

	self assertMatchesCPythonAt: 'string_eval_unaffected'.
	self assertMatchesCPythonAt: 'string_exec_unaffected'.
	self assertMatchesCPythonAt: 'bad_mode_still_refused'.
	self assertMatchesCPythonAt: 'syntax_error_still_raised'.

]
