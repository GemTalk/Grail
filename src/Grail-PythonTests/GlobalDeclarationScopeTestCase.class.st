Class {
	#name : 'GlobalDeclarationScopeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
GlobalDeclarationScopeTestCase >> setUp [
	"Reload tests/python/global_declaration_scope.py fresh each test -- the
	module's own globals are what several of these read and write."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'global_declaration_scope' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/global_declaration_scope.py')
		name: 'global_declaration_scope'.

]

{ #category : 'Grail-Tests' }
GlobalDeclarationScopeTestCase >> testDeclarationDoesNotLeakToASibling [
	"g declares global y; its sibling h does not, so h's y is the enclosing
	function's local.  CPython had this exact bug in its own symbol table
	once, which is why test_scope carries a test for it."

	self assert: testModule @env1:declaration_does_not_leak_to_a_sibling asArray
		equals: #( 9 2 ).

]

{ #category : 'Grail-Tests' }
GlobalDeclarationScopeTestCase >> testExecReadThroughInterveningScope [
	"Identical source to testReadThroughInterveningScope, run through exec.
	It failed for a second reason there -- lexical capture of the doit's
	scope slot by the enclosing def's temp -- so it needs its own test."

	self assert: testModule @env1:exec_read_through_intervening_scope asArray
		equals: #( 7 7 ).

]

{ #category : 'Grail-Tests' }
GlobalDeclarationScopeTestCase >> testExecScopeHandleIsNotABinding [
	"The scope handle is machinery.  It lives IN the scope dictionary, which
	is also what the reflect-back walks, so without an explicit skip it would
	appear in the caller's namespace as a name the source never defined."

	self assert: testModule @env1:exec_scope_handle_is_not_a_binding asArray
		equals: #().

]

{ #category : 'Grail-Tests' }
GlobalDeclarationScopeTestCase >> testExecSeparateGlobalsAndLocals [
	"Three-argument exec: the global-declared binding lands in the globals
	mapping, the rest in locals."

	self assert: testModule @env1:exec_separate_globals_and_locals asArray
		equals: #( 9 2 ).

]

{ #category : 'Grail-Tests' }
GlobalDeclarationScopeTestCase >> testExecWriteThroughInterveningScope [
	"The store half, and the worse failure of the two: routed to the
	enclosing local the assignment SUCCEEDS, so nothing raises and the global
	quietly keeps its old value."

	self assert: testModule @env1:exec_write_through_intervening_scope asArray
		equals: #( 2 2 ).

]

{ #category : 'Grail-Tests' }
GlobalDeclarationScopeTestCase >> testGlobalDeclaredButUnbound [
	"Declared global and bound nowhere: NameError, not UnboundLocalError --
	the name is not a local, so the local-read guard must not claim it."

	self assert: testModule @env1:global_declared_but_unbound equals: 'NameError'.

]

{ #category : 'Grail-Tests' }
GlobalDeclarationScopeTestCase >> testOwnLocalBeatsAnOuterGlobalDeclaration [
	"The INNERMOST scope with something to say wins.  k binds its own x, so
	g's declaration does not reach it -- a walk that stopped at the first
	global declaration it met rather than at the first BINDING would answer
	the global here."

	self assert: testModule @env1:own_local_beats_an_outer_global_declaration asArray
		equals: #( 5 1 ).

]

{ #category : 'Grail-Tests' }
GlobalDeclarationScopeTestCase >> testReadThroughInterveningScope [
	"THE BUG.  h is two scopes inside the one that declared x global, and the
	scope in between has a local x -- which used to win."

	self assert: testModule @env1:read_through_intervening_scope equals: 7.

]

{ #category : 'Grail-Tests' }
GlobalDeclarationScopeTestCase >> testWriteThenReadThroughInterveningScope [
	"The declaring scope assigns as well: the nested read must see the new
	GLOBAL value (2), and the intervening function's own local is untouched
	at 3."

	self assert: testModule @env1:write_then_read_through_intervening_scope asArray
		equals: #( 2 3 ).

]
