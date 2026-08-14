! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecClassMethodScopeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecClassMethodScopeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecClassMethodScopeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecClassMethodScopeTestCase
!
! A method of a class defined inside exec() could not read a name from the
! exec'd source AT ALL:
!
!     exec('''x = 12
!     class C:
!         def get(self): return x
!     got = C().get()''')
!
! A doit runs with a SymbolDictionary of its names on the COMPILER's symbol
! list, which is how ``x'' resolves everywhere else in that source.  But a class
! defined there compiles its METHODS at RUNTIME, through
! ___compileMethod:category:, against the user profile's symbol list -- and the
! doit's scope is not on that.  So ``get'' failed to COMPILE.
!
! It did not look like a scope problem.  Grail installs a raising stub for any
! method it cannot compile (so one bad method does not abort a whole classdef),
! so the call came back as ``NameError: Grail could not compile this method
! (codegen gap)'' -- pointing at codegen rather than at the symbol list.
!
! ___compileMethod:category:scope: now takes the scope and inserts it at the
! front of the dictionaries, and ClassDefAst passes the doit's own -- named
! through the handle ensureModuleScope: parks in the scope for exactly this
! kind of use.  Outside a doit there is no scope to pass and nothing changes.
!
! The read is LIVE, not captured: the compiled method references the scope's
! SLOT, so rebinding the name in the exec'd namespace afterwards changes what a
! later call sees.  A test pins that, since a fix that baked the value in at
! compile time would pass the headline case.
!
! KNOWN GAP, deliberately not covered here.  ``global'' declared in a CLASS BODY
! still does not work -- ``class C: global x; x = 13'' binds a class attribute
! and leaves the module's x alone, where CPython rebinds x and gives C no such
! attribute.  I implemented it and withdrew it: a class body is emitted in two
! phases (attribute initialisers, then runtime statements) rather than in source
! order, so the write landed after every attribute value had been computed, and
! an attribute READING the name saw the pre-write value.  That flipped
! test_listcomps' test_explicit_global from passing to failing -- ``global g; g =
! 2; y = g'' expects y == 2.  Closing it means running a class body in source
! order, the same constraint ClassBodyAugAssignTestCase records.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/exec_class_method_scope.py under it directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecClassMethodScopeTestCase removeAllMethods.
ExecClassMethodScopeTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: ExecClassMethodScopeTestCase
setUp
	"Reload tests/python/exec_class_method_scope.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exec_class_method_scope' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/exec_class_method_scope.py')
		name: 'exec_class_method_scope'.
%

category: 'Grail-Tests'
method: ExecClassMethodScopeTestCase
testMethodReadsAnExecLevelVariable
	"THE BUG, at its smallest.  Before: the call raised the codegen-gap
	NameError, because ``get'' had never compiled."

	self assert: testModule @env1:method_reads_an_exec_level_variable asArray
		equals: #( 12 ).
%

category: 'Grail-Tests'
method: ExecClassMethodScopeTestCase
testMethodCallsAnExecLevelFunction
	"A function the same source bound is the same kind of name -- nothing
	about the fix is specific to variables."

	self assert: testModule @env1:method_calls_an_exec_level_function asArray
		equals: #( 12 ).
%

category: 'Grail-Tests'
method: ExecClassMethodScopeTestCase
testMethodReadsASiblingClass
	self assert: testModule @env1:method_reads_a_sibling_class asArray
		equals: #( 7 ).
%

category: 'Grail-Tests'
method: ExecClassMethodScopeTestCase
testTheReadIsLiveNotCaptured
	"The method references the scope SLOT, so rebinding the exec-level name
	after the class is built changes what the next call answers.  A fix that
	baked the value in at compile time would answer 1 twice and still pass
	every other test here."

	self assert: testModule @env1:the_read_is_live_not_captured asArray
		equals: #( 1 2 ).
%

category: 'Grail-Tests'
method: ExecClassMethodScopeTestCase
testAMissingNameStillRaisesNameError
	"Putting the scope on the symbol list must not turn an unbound name into a
	compile failure or a silent nil.  It is still a Python NameError, raised
	when the method RUNS -- which is also what tells the two apart: the old
	behaviour raised at the first call of ANY method mentioning an exec-level
	name, bound or not."

	self assert: testModule @env1:a_missing_name_still_raises_name_error asArray
		equals: #( 'NameError' ).
%

category: 'Grail-Tests'
method: ExecClassMethodScopeTestCase
testAClassBodyValueReadingTheScopeStillWorks
	"A class BODY could always read exec-level names -- it is emitted inline
	into the doit, not compiled as a method.  Pins that the change left that
	path alone."

	self assert: testModule @env1:a_class_body_value_reading_the_scope_still_works asArray
		equals: #( 6 ).
%
