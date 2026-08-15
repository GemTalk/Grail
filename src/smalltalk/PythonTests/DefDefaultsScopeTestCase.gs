! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DefDefaultsScopeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DefDefaultsScopeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DefDefaultsScopeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DefDefaultsScopeTestCase
!
! ``def f(x=x)'' -- a default expression is evaluated in the scope ENCLOSING the
! def, at definition time, so a parameter of the same name does not shadow it:
!
!     limit = 7
!     def f(v, limit=limit):      -- the default reads the MODULE's limit
!         return limit            -- the body reads the PARAMETER
!
! Grail resolved the default in the function's OWN scope.  The rule that fixes
! it already existed -- ___pythonLocalInEnclosingFunctions___ and its two
! sibling walks skip a scope node reached through its ArgumentsAst -- but was
! restricted to LambdaAst, on the belief that a def's defaults were already
! handled by FunctionDefAst's own default-capture path.  They were not, and the
! idiom broke three different ways depending on where the def sat:
!
!   * MODULE-LEVEL def -- the default read the parameter, which is still nil
!     while its own default is being computed, so f(0) answered None
!   * def or lambda NESTED IN A DEF, over a MODULE GLOBAL -- the default is
!     hoisted into a definition-time block outside the function, where a bare
!     identifier for a module attribute does not compile.  The WHOLE MODULE
!     failed to import: CompileError 1001, ``undefined symbol''
!   * a CLASS-BODY METHOD, whose default is emitted inline -- the third emit
!     path, same rule
!
! The walk skips only the scope it climbed out of, so an ENCLOSING FUNCTION's
! local is still found (testNestedDefOverAnEnclosingLocal).  Widening it further
! would break that, which is why the two nested cases are tested as a pair.
!
! Found through test_copy, whose CPython implementation opens with
! ``def _deepcopy_list(x, memo, deepcopy=deepcopy)'' -- ten failures reading
! ``'UndefinedObject' object is not callable'', all of them that None being
! called.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/def_defaults_scope.py under it directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DefDefaultsScopeTestCase removeAllMethods.
DefDefaultsScopeTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: DefDefaultsScopeTestCase
setUp
	"Reload tests/python/def_defaults_scope.py fresh each test -- one of the
	fixtures rebinds a module global to prove definition-time evaluation."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'def_defaults_scope' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/def_defaults_scope.py')
		name: 'def_defaults_scope'.
%

category: 'Grail-Tests'
method: DefDefaultsScopeTestCase
testModuleLevelDefault
	"THE BUG, simplest form.  Grail answered None: the default read the very
	parameter it was about to bind."

	self assert: (testModule @env1:module_level: 0) equals: 7.
%

category: 'Grail-Tests'
method: DefDefaultsScopeTestCase
testModuleLevelCallableDefault
	"The shape that matters in practice -- the idiom exists to make a
	module-level function a local lookup, so the None was CALLED rather than
	merely read.  That is copy.py's ``deepcopy=deepcopy''."

	self assert: (testModule @env1:module_level_callable: 0) equals: 'h0'.
%

category: 'Grail-Tests'
method: DefDefaultsScopeTestCase
testTheBodyStillReadsTheParameter
	"Only the DEFAULT escapes the function's scope.  A fix that routed every
	mention of the name to the enclosing scope would pass the test above and
	break this one."

	self assert: (testModule @env1:the_body_still_reads_the_parameter: 0)
		equals: 7.
%

category: 'Grail-Tests'
method: DefDefaultsScopeTestCase
testClassBodyMethodDefaults
	"A class-body method's default is emitted INLINE -- a third emit path with
	the same rule.  The third element passes the parameter explicitly, so the
	body's own binding is pinned here too."

	self assert: testModule @env1:class_body_method_defaults asArray
		equals: #( 7 'h5' 42 ).
%

category: 'Grail-Tests'
method: DefDefaultsScopeTestCase
testNestedDefOverAModuleGlobal
	"THE COMPILE ERROR.  The default is hoisted into a definition-time block
	OUTSIDE the nested def, where the name is a module attribute rather than a
	temp; emitting a bare identifier there failed to compile and took the whole
	module with it -- so this fixture could not be imported at all."

	self assert: testModule @env1:nested_def_over_a_module_global equals: 7.
%

category: 'Grail-Tests'
method: DefDefaultsScopeTestCase
testNestedDefOverAnEnclosingLocal
	"THE OTHER HALF, and the reason the rule is per-scope rather than a blanket
	``defaults resolve at module scope''.  The walk skips only the scope it
	climbed out of, so an enclosing FUNCTION's local still claims the name."

	self assert: testModule @env1:nested_def_over_an_enclosing_local
		equals: 'enclosing'.
%

category: 'Grail-Tests'
method: DefDefaultsScopeTestCase
testALambdaInADefOverAModuleGlobal
	"The lambda half of the same emit, over a module global rather than an
	enclosing local -- the case LambdaDefaultsTestCase does not reach, since
	the rule was already right for lambdas over enclosing locals."

	self assert: testModule @env1:a_lambda_in_a_def_over_a_module_global
		equals: 7.
%

category: 'Grail-Tests'
method: DefDefaultsScopeTestCase
testDefaultsAreEvaluatedAtDefinitionTime
	"A default is evaluated ONCE, when the def executes, so rebinding the name
	afterwards does not change it."

	self assert: testModule @env1:defaults_are_evaluated_at_definition_time
		equals: 7.
%

category: 'Grail-Tests'
method: DefDefaultsScopeTestCase
testAMutableDefaultIsStillShared
	"The same list across calls -- the property the definition-time emit exists
	to preserve, and the one a naive ``re-evaluate the default per call'' fix
	would lose."

	self assert: testModule @env1:a_mutable_default_is_still_shared asArray
		equals: #( 1 2 3 ).
%

category: 'Grail-Tests'
method: DefDefaultsScopeTestCase
testAnOrdinaryDefaultIsUnaffected
	"A default naming something the function does not bind takes the path it
	always did."

	self assert: testModule @env1:an_ordinary_default_is_unaffected
		equals: 'h3'.
%
