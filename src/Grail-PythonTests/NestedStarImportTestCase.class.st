Class {
	#name : 'NestedStarImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NestedStarImportTestCase >> resultAt: aKey [
	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
NestedStarImportTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'nested_star_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nested_star_import.py')
		name: 'nested_star_import'.
	probe := testModule @env1:___pyAttrLoad___: #'RESULTS'

]

{ #category : 'Grail-Tests' }
NestedStarImportTestCase >> testEveryCompoundStatementBinds [
	"``if'', ``with'', ``for'' and ``while'' introduce no Python scope either,
	so all four are module level and all four have to expand.  Enumerated
	rather than sampled: the search is a generic walk, and a walk that reached
	only the shape it was written for would pass a single-case test."

	self assert: (self resultAt: 'if_body_binds') equals: 'True'.
	self assert: (self resultAt: 'with_body_binds') equals: 'True'.
	self assert: (self resultAt: 'for_body_binds') equals: 'True'.
	self assert: (self resultAt: 'while_body_binds') equals: 'True'.
	self assert: (self resultAt: 'nested_two_deep_binds') equals: 'True'.

]

{ #category : 'Grail-Tests' }
NestedStarImportTestCase >> testScopeRuleStillEnforced [
	"Widening WHERE a star import is expanded must not widen where one is
	ALLOWED.  CPython rejects it in a function or class body with a specific
	message, measured here rather than recalled, and Grail's parser already
	raises exactly that; the walk stops at those nodes on the strength of it."

	self assert: (self resultAt: 'star_in_def_is_syntaxerror') equals: 'True'.
	self assert: (self resultAt: 'star_in_class_is_syntaxerror') equals: 'True'.
	self assert: (self resultAt: 'star_in_module_try_compiles') equals: 'True'.

]

{ #category : 'Grail-Tests' }
NestedStarImportTestCase >> testTopLevelAndNamedImportsUndisturbed [
	"Controls.  The top-level star import is the path the nested one was made
	to reuse, and a named import written beside a star in the SAME nested block
	shares printSmalltalkOn: with it -- so both have to keep working for the
	fix to mean what it claims."

	self assert: (self resultAt: 'toplevel_still_works') equals: 'True'.
	self assert: (self resultAt: 'alias_beside_star') equals: 'True'.

]

{ #category : 'Grail-Tests' }
NestedStarImportTestCase >> testTryBodyBinds [
	"THE BUG, in the shape pyyaml and pydantic are written in.  Before the fix
	the fixture did not merely fail these -- it could not be LOADED at all, so
	setUp itself died with an uncatchable CompileError."

	self assert: (self resultAt: 'try_body_binds') equals: 'True'.
	self assert: (self resultAt: 'except_branch_binds') equals: 'True'.
	self assert: (self resultAt: 'missing_module_is_catchable') equals: 'True'.

]
