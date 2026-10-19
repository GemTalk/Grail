Class {
	#name : 'CompileOptimizeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CompileOptimizeTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
CompileOptimizeTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'compile_optimize' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_optimize.py')
		name: 'compile_optimize'.

]

{ #category : 'Grail-Tests - through an AST' }
CompileOptimizeTestCase >> testAModeMismatchIsRefused [
	"The two trees are otherwise interchangeable, so accepting the wrong one
	runs a module body as an expression and ANSWERS something."

	self assertMatchesCPythonAt: 'tree_eval'.

]

{ #category : 'Grail-Tests - the four levels' }
CompileOptimizeTestCase >> testEachEffectOnItsOwn [
	"The combined rows above would pass with two effects right and one wrong
	in a compensating way.  These separate them."

	self assertMatchesCPythonAt: 'assert_by_level'.
	self assertMatchesCPythonAt: 'debug_by_level'.
	self assertMatchesCPythonAt: 'docstring_by_level'.

]

{ #category : 'Grail-Tests - Controls' }
CompileOptimizeTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '18 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
CompileOptimizeTestCase >> testTheDefaultDidNotMove [
	"-1 is what every compile in the corpus has always got: asserts fire,
	__debug__ is True, docstrings survive, and an exec with no compile() at
	all is untouched."

	self assertMatchesCPythonAt: 'plain_assert_fires'.
	self assertMatchesCPythonAt: 'plain_debug'.
	self assertMatchesCPythonAt: 'plain_docstring'.
	self assertMatchesCPythonAt: 'module_level_assert'.
	self assertMatchesCPythonAt: 'exec_without_compile'.

]

{ #category : 'Grail-Tests - the four levels' }
CompileOptimizeTestCase >> testTheLevelsDifferAsCPythonsDo [
	"One source, four levels, four different answers -- which is how
	test_compile distinguishes them.  Each answer carries all three effects at
	once: whether the assert fired, the docstring, and __debug__."

	self assertMatchesCPythonAt: 'level_default'.
	self assertMatchesCPythonAt: 'level_0'.
	self assertMatchesCPythonAt: 'level_1'.
	self assertMatchesCPythonAt: 'level_2'.

]

{ #category : 'Grail-Tests - through an AST' }
CompileOptimizeTestCase >> testTheSameFourThroughATree [
	"``compile(ast.parse(src, optimize=n), f, mode, optimize=n)'' must answer
	what compiling the source directly answers -- test_compile runs both and
	compares.  The tree carries its source, which is what makes an AST
	compilable at all here."

	self assertMatchesCPythonAt: 'tree_default'.
	self assertMatchesCPythonAt: 'tree_0'.
	self assertMatchesCPythonAt: 'tree_1'.
	self assertMatchesCPythonAt: 'tree_2'.
	self assertMatchesCPythonAt: 'tree_compiles'.

]
