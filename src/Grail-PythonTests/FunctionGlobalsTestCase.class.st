Class {
	#name : 'FunctionGlobalsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FunctionGlobalsTestCase >> assertCheckPasses: aName [
	"The fixture answers true, or a string naming what it saw.  Reported either
	way -- an identity failure has several possible causes (a copy, a wrapped
	accessor, the wrong module) and the string distinguishes them."

	| answer |
	answer := testModule @env0:perform: aName asSymbol env: 1.
	self assert: (answer = true)
		description: 'function-globals check failed: ' , aName , ' -> ' , answer printString.

]

{ #category : 'Grail-Setup' }
FunctionGlobalsTestCase >> setUp [
	"Reloaded per test: globals_are_live_not_a_snapshot WRITES into the module
	namespace, and although it removes what it planted, a shared instance would
	make that cleanup load-bearing for the other tests rather than merely tidy."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_globals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_globals.py')
		name: 'function_globals'.

]

{ #category : 'Grail-Tests - Identity' }
FunctionGlobalsTestCase >> testAMethodAndABoundMethodSeeThem [
	"Both handle shapes for a method: the unbound one off the class and the
	bound one off an instance.  They resolve their module from different
	receivers -- a class and an instance -- which is the case
	BoundMethod >> __module__ reconciles."

	self assertCheckPasses: 'a_method_sees_its_defining_modules_globals'.
	self assertCheckPasses: 'a_bound_method_sees_them_too'.

]

{ #category : 'Grail-Tests - Identity' }
FunctionGlobalsTestCase >> testAModuleLevelFunctionSeesItsModuleGlobals [
	"``top_level.__globals__ is globals()''.  A module-level def is a
	BoundMethod whose receiver is the module."

	self assertCheckPasses: 'a_module_level_function_sees_its_module_globals'.

]

{ #category : 'Grail-Tests - Identity' }
FunctionGlobalsTestCase >> testANestedFunctionSeesTheSameGlobals [
	"Not a restatement of the test above.  A nested def is a Smalltalk BLOCK, a
	different class reached by a different route (per-user ExecBlockAttrs rather
	than a BoundMethod method), so the two can regress independently."

	self assertCheckPasses: 'a_nested_function_sees_the_same_globals'.

]

{ #category : 'Grail-Tests - Liveness' }
FunctionGlobalsTestCase >> testGlobalsAreLiveNotASnapshot [
	"Why identity is the contract and not merely a nicety: a name planted in
	globals() must be visible through __globals__ and a name written through
	__globals__ must be visible in globals().  A copy passes every equality
	check and fails both directions of this one."

	self assertCheckPasses: 'globals_are_live_not_a_snapshot'.

]

{ #category : 'Grail-Tests - Write Guards' }
FunctionGlobalsTestCase >> testGlobalsCannotBeAssignedOrDeleted [
	"These already worked before the read existed -- __globals__ was listed in
	___readOnlyFunctionAttrs___ all along, which is why the gap was write-shaped
	from one side and read-shaped from the other.  Pinned so a change to the read
	path cannot quietly open the write one."

	self assertCheckPasses: 'globals_cannot_be_assigned'.
	self assertCheckPasses: 'globals_cannot_be_deleted'.

]

{ #category : 'Grail-Tests - The Attribute Protocol' }
FunctionGlobalsTestCase >> testGlobalsIsAMappingNotACallable [
	"THE TRIPWIRE for the bug that actually took two attempts.  Grail wraps a
	dunder read as a BoundMethod unless the class lists it in
	___pythonValueAttrs___, so __globals__ answered a callable rather than the
	dict -- correct resolution, delivered wrapped.  Checked as ``has keys, is not
	callable, and contains a known module name'' rather than by type name, so it
	holds for whichever mapping class the module namespace uses."

	self assertCheckPasses: 'a_module_level_function_sees_a_mapping'.

]

{ #category : 'Grail-Tests - Identity' }
FunctionGlobalsTestCase >> testTwoFunctionsInOneModuleShareOneGlobals [
	"The memo is per MODULE, not per function.  A per-function view would pass
	every check above and fail this one."

	self assertCheckPasses: 'two_functions_in_one_module_share_one_globals'.

]
