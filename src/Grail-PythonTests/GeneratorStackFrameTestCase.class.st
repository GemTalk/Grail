Class {
	#name : 'GeneratorStackFrameTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
GeneratorStackFrameTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
GeneratorStackFrameTestCase >> setUp [
	"Reload tests/python/generator_stack_frames.py fresh each test.  The module
	body is the measurement: every entry in ``r'' was taken while a particular
	stack was live and cannot be recomputed afterwards."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'generator_stack_frames' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_stack_frames.py')
		name: 'generator_stack_frames'.

]

{ #category : 'Grail-Tests - Generator Frames' }
GeneratorStackFrameTestCase >> testADelegatingGeneratorIsVisible [
	"THE TEST THIS EXISTS FOR -- test_yield_from's
	test_delegator_is_visible_to_debugger.  ``spam'' is on another GsProcess
	entirely, blocked waiting for the generator it delegates to."

	self assertMatchesCPythonAt: 'one'.

]

{ #category : 'Grail-Tests - Generator Frames' }
GeneratorStackFrameTestCase >> testAGeneratorReportsItsOwnFrame [
	"``def gen(): yield f()'' walked from inside f reported ['f'] where CPython
	reports ['f', 'gen', ...].  The body is a block and its def already
	returned, so no frame on this process could name it."

	self assertMatchesCPythonAt: 'plain'.

]

{ #category : 'Grail-Tests - Generator Frames' }
GeneratorStackFrameTestCase >> testAResumedGeneratorStillSeesItsConsumer [
	"The link to the consumer is re-read on EVERY resume, because the process
	driving a generator can differ from one next() to the next.  Recording it
	once when the body is forked passes every other test in this file."

	self assertMatchesCPythonAt: 'resumed'.

]

{ #category : 'Grail-Tests - Generator Frames' }
GeneratorStackFrameTestCase >> testGeneratorFramesThatAreNestedDefsAreNamed [
	"test_delegator_is_visible_to_debugger's own NESTING: call_stack, gen, spam
	and eggs defined inside one method (and, separately, one function), so each
	generator frame is a nested def named from a line inside the enclosing
	method's attached source.  An IR method's source is the UNPADDED def slice
	while the line asked about is a MODULE line; indexing one with the other
	named gen as spam, and in a function named both gen and spam as the
	function itself."

	self assertMatchesCPythonAt: 'nested_defs_in_method'.
	self assertMatchesCPythonAt: 'nested_defs_in_function'.

]

{ #category : 'Grail-Tests - Generator Frames' }
GeneratorStackFrameTestCase >> testNestedDelegationsAppearInOrder [
	"Two delegations deep, and ORDER rather than mere membership: gen inside
	eggs inside spam.  A walk that concatenated the sections the other way round
	would still contain every name."

	self assertMatchesCPythonAt: 'two'.
	self assertMatchesCPythonAt: 'gen_inside_eggs'.
	self assertMatchesCPythonAt: 'eggs_inside_spam'.
	self assertMatchesCPythonAt: 'no_duplicate_frames'.

]

{ #category : 'Grail-Tests - Generator Frames' }
GeneratorStackFrameTestCase >> testTheConsumerChainIncludesNestedFunctions [
	"The consumer's own frames are walked by the same rules as the current
	process's, so a nested ``def'' driving the generator is named by
	___nestedFunctionNameFor___ rather than by a Smalltalk selector -- a
	different route through the walk than a module-level def takes."

	self assertMatchesCPythonAt: 'nested_caller'.

]

{ #category : 'Grail-Tests - Basics' }
GeneratorStackFrameTestCase >> testThereIsAStackAtAll [
	"inspect.stack() was a stub answering []; currentframe() was a hardcoded
	None.  Both read as ``there is no stack'' rather than ``stacks are not
	supported'', and a caller cannot tell the difference."

	self assertMatchesCPythonAt: 'stack_is_list'.
	self assertMatchesCPythonAt: 'currentframe_names_caller'.
	self assertMatchesCPythonAt: 'no_generator'.

]
