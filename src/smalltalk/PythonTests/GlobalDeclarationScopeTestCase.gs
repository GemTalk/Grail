! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GlobalDeclarationScopeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GlobalDeclarationScopeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
GlobalDeclarationScopeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GlobalDeclarationScopeTestCase
!
! Which scope a name resolves to once some ENCLOSING scope declared it
! ``global''.  The declaration binds the name to the module for the whole of
! the declaring scope -- including the functions nested inside it:
!
!     x = 7
!     def f():
!         x = 1
!         def g():
!             global x
!             def h(): return x     # CPython 7; Grail answered f's 1
!             return h()
!         return g()
!
! Grail consulted only the NEAREST enclosing function, which is the right rule
! for a STORE (``x = 1'' binds the scope it is written in) but not for a free
! READ: resolution walks outward and must stop at the innermost scope that
! either BINDS the name or DECLARES it global, whichever comes first.  Testing
! the two separately let an intervening scope's local win.
!
! Inside exec()/eval() the same code was wrong for a SECOND, independent
! reason.  A doit's names live in a SymbolDictionary on the compiler's symbol
! list, so a module-level ``x'' and an enclosing def's local ``x'' are both
! spelled ``x'' in the generated Smalltalk -- and Smalltalk resolves an
! identifier LEXICALLY, so the block temp shadowed the dictionary slot and the
! global declaration did nothing.  ensureModuleScope: now parks a handle on the
! scope inside the scope itself, and codegen names the slot through it, which
! no temp can shadow.  The store side had the worse failure of the two: the
! assignment succeeded against the enclosing local and the global silently kept
! its old value.
!
! A COMPREHENSION TARGET is deliberately exempt.  A comprehension has its own
! scope, so its loop variable shadows the declaration for the length of the
! comprehension -- ``global g'' then ``[g for g in [1]]'' iterates the
! comprehension's own g.  Without that exemption the doit branch outranked the
! comprehension-target one and read the global instead (test_listcomps
! test_explicit_global / test_explicit_global_3, both caught by the full suite
! rather than by any test here).
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/global_declaration_scope.py under it directly.
!
! KNOWN GAP, deliberately not asserted.  A ``global'' declared in a CLASS body
! inside exec still does not work, because a method of a class defined in a
! doit cannot read the doit's scope AT ALL -- ___compileMethod:category: compiles
! it against the user profile's symbol list, which the doit scope is not on:
!
!     exec('''x = 12
!     class C:
!         def get(self): return x
!     got = C().get()''')          # NameError: could not compile this method
!
! That has nothing to do with ``global'' (the version without any declaration
! fails identically, and fails the same way on main), and fixing it is a
! separate change.  test_scope's testScopeOfGlobalStmt now advances past the
! four cases this change fixes and stops there.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GlobalDeclarationScopeTestCase removeAllMethods.
GlobalDeclarationScopeTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: GlobalDeclarationScopeTestCase
setUp
	"Reload tests/python/global_declaration_scope.py fresh each test -- the
	module's own globals are what several of these read and write."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'global_declaration_scope' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/global_declaration_scope.py')
		name: 'global_declaration_scope'.
%

! ------------------------------------------------ resolution through nested defs

category: 'Grail-Tests'
method: GlobalDeclarationScopeTestCase
testReadThroughInterveningScope
	"THE BUG.  h is two scopes inside the one that declared x global, and the
	scope in between has a local x -- which used to win."

	self assert: testModule @env1:read_through_intervening_scope equals: 7.
%

category: 'Grail-Tests'
method: GlobalDeclarationScopeTestCase
testWriteThenReadThroughInterveningScope
	"The declaring scope assigns as well: the nested read must see the new
	GLOBAL value (2), and the intervening function's own local is untouched
	at 3."

	self assert: testModule @env1:write_then_read_through_intervening_scope asArray
		equals: #( 2 3 ).
%

category: 'Grail-Tests'
method: GlobalDeclarationScopeTestCase
testOwnLocalBeatsAnOuterGlobalDeclaration
	"The INNERMOST scope with something to say wins.  k binds its own x, so
	g's declaration does not reach it -- a walk that stopped at the first
	global declaration it met rather than at the first BINDING would answer
	the global here."

	self assert: testModule @env1:own_local_beats_an_outer_global_declaration asArray
		equals: #( 5 1 ).
%

category: 'Grail-Tests'
method: GlobalDeclarationScopeTestCase
testDeclarationDoesNotLeakToASibling
	"g declares global y; its sibling h does not, so h's y is the enclosing
	function's local.  CPython had this exact bug in its own symbol table
	once, which is why test_scope carries a test for it."

	self assert: testModule @env1:declaration_does_not_leak_to_a_sibling asArray
		equals: #( 9 2 ).
%

category: 'Grail-Tests'
method: GlobalDeclarationScopeTestCase
testGlobalDeclaredButUnbound
	"Declared global and bound nowhere: NameError, not UnboundLocalError --
	the name is not a local, so the local-read guard must not claim it."

	self assert: testModule @env1:global_declared_but_unbound equals: 'NameError'.
%

! ------------------------------------------------ the same, inside exec()

category: 'Grail-Tests'
method: GlobalDeclarationScopeTestCase
testExecReadThroughInterveningScope
	"Identical source to testReadThroughInterveningScope, run through exec.
	It failed for a second reason there -- lexical capture of the doit's
	scope slot by the enclosing def's temp -- so it needs its own test."

	self assert: testModule @env1:exec_read_through_intervening_scope asArray
		equals: #( 7 7 ).
%

category: 'Grail-Tests'
method: GlobalDeclarationScopeTestCase
testExecWriteThroughInterveningScope
	"The store half, and the worse failure of the two: routed to the
	enclosing local the assignment SUCCEEDS, so nothing raises and the global
	quietly keeps its old value."

	self assert: testModule @env1:exec_write_through_intervening_scope asArray
		equals: #( 2 2 ).
%

category: 'Grail-Tests'
method: GlobalDeclarationScopeTestCase
testExecSeparateGlobalsAndLocals
	"Three-argument exec: the global-declared binding lands in the globals
	mapping, the rest in locals."

	self assert: testModule @env1:exec_separate_globals_and_locals asArray
		equals: #( 9 2 ).
%

category: 'Grail-Tests'
method: GlobalDeclarationScopeTestCase
testExecScopeHandleIsNotABinding
	"The scope handle is machinery.  It lives IN the scope dictionary, which
	is also what the reflect-back walks, so without an explicit skip it would
	appear in the caller's namespace as a name the source never defined."

	self assert: testModule @env1:exec_scope_handle_is_not_a_binding asArray
		equals: #().
%
