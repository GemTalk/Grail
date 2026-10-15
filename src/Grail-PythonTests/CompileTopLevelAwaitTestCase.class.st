Class {
	#name : 'CompileTopLevelAwaitTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CompileTopLevelAwaitTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
CompileTopLevelAwaitTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'compile_top_level_await' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_top_level_await.py')
		name: 'compile_top_level_await'.

]

{ #category : 'Grail-Tests - running the result' }
CompileTopLevelAwaitTestCase >> testEvalAnswersACoroutineThatBindsIntoTheGlobals [
	"``eval(co, g)'' answers a coroutine -- not the body's value, and not
	None -- and driving it to completion leaves the body's assignments in g.
	The optimized-assert row is gh-121637: under -OO the await is optimized
	away and the bit must still be set."

	self assertMatchesCPythonAt: 'eval_answers_coroutine'.
	self assertMatchesCPythonAt: 'eval_binds_await'.
	self assertMatchesCPythonAt: 'eval_binds_async_for'.
	self assertMatchesCPythonAt: 'eval_binds_async_with'.
	self assertMatchesCPythonAt: 'eval_binds_async_comp'.
	self assertMatchesCPythonAt: 'eval_binds_awaiting_comp'.
	self assertMatchesCPythonAt: 'eval_binds_single_mode'.
	self assertMatchesCPythonAt: 'eval_binds_optimized_assert'.
	self assertMatchesCPythonAt: 'optimized_assert_keeps_bit'.

]

{ #category : 'Grail-Tests - Controls' }
CompileTopLevelAwaitTestCase >> testEvalLeavesNoWrapperBehind [
	"The wrapper is an implementation detail and must not appear in the
	caller's globals -- and removing it must leave those globals ITERABLE,
	which is the PyDict defect this found."

	| b r g |
	self assertMatchesCPythonAt: 'eval_leaves_no_wrapper'.
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	g := r @env1:__getitem__: 'eval_leaves_no_wrapper'.
	self assert: (b @env1:repr: g) asString equals: '[]'.

]

{ #category : 'Grail-Tests - the coroutine bit' }
CompileTopLevelAwaitTestCase >> testEveryAwaitingShapeSetsTheBit [
	"An await, an async for, an async with, and the three comprehension
	spellings -- the comprehensions being the ones that carry their async-ness
	as a flag rather than as a node kind."

	self assertMatchesCPythonAt: 'await_sets_bit'.
	self assertMatchesCPythonAt: 'async_for_sets_bit'.
	self assertMatchesCPythonAt: 'async_with_sets_bit'.
	self assertMatchesCPythonAt: 'async_listcomp_sets_bit'.
	self assertMatchesCPythonAt: 'async_setcomp_sets_bit'.
	self assertMatchesCPythonAt: 'async_dictcomp_sets_bit'.
	self assertMatchesCPythonAt: 'nested_async_comp_sets_bit'.
	self assertMatchesCPythonAt: 'single_mode_sets_bit'.

]

{ #category : 'Grail-Tests - Controls' }
CompileTopLevelAwaitTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '33 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - running the result' }
CompileTopLevelAwaitTestCase >> testFunctionTypeIsConstructibleFromTheCodeObject [
	"The other documented way to run it: FunctionType(co, g) answers a
	callable, and calling it answers the coroutine.  Its refusals are
	CPython's -- fewer than two arguments, and a first argument that is not a
	code object."

	self assertMatchesCPythonAt: 'functiontype_binds_await'.
	self assertMatchesCPythonAt: 'functiontype_binds_async_with'.
	self assertMatchesCPythonAt: 'functiontype_needs_two_args'.
	self assertMatchesCPythonAt: 'functiontype_needs_code'.

]

{ #category : 'Grail-Tests - the coroutine bit' }
CompileTopLevelAwaitTestCase >> testNothingElseSetsTheBit [
	"The careful half.  An ``async def'' whose awaits are all inside it is an
	ordinary module, and a plain comprehension contains nothing async -- five
	shapes that each look async-ish and must compile with the bit clear, or
	the caller is told to await something that cannot be awaited."

	self assertMatchesCPythonAt: 'plain_def_clear'.
	self assertMatchesCPythonAt: 'async_def_clear'.
	self assertMatchesCPythonAt: 'listcomp_clear'.
	self assertMatchesCPythonAt: 'setcomp_clear'.
	self assertMatchesCPythonAt: 'genexp_clear'.
	self assertMatchesCPythonAt: 'dictcomp_clear'.

]

{ #category : 'Grail-Tests - the gate' }
CompileTopLevelAwaitTestCase >> testTheRelaxationIsScopedToTheModuleBody [
	"Without the flag the source is refused; WITH it, a plain def inside the
	source is still a synchronous scope and awaiting in one is still a
	SyntaxError.  The second pair is what tells a scoped relaxation from a
	hole in the parser."

	self assertMatchesCPythonAt: 'refused_without_flag'.
	self assertMatchesCPythonAt: 'async_for_refused_without_flag'.
	self assertMatchesCPythonAt: 'await_in_def_still_refused'.
	self assertMatchesCPythonAt: 'async_for_in_def_still_refused'.
	self assertMatchesCPythonAt: 'async_comp_in_def_still_refused'.

]
