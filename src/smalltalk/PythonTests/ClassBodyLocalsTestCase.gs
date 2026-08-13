! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyLocalsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyLocalsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyLocalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyLocalsTestCase
!
! ``locals()'' (and zero-arg ``vars()'') inside a CLASS BODY.
!
! A class body executes as a namespace, so its locals() is the mapping being
! built into the class.  Grail answered the ENCLOSING FUNCTION's locals instead:
! the classdef is emitted in that function's scope, so CallAst's
! functionBeingCompiled still pointed at it and the locals() rewrite used that
! snapshot.  The names it reported were from a different scope entirely -- and
! Python's scoping rules say a class body cannot see them at all, since class
! scope is skipped when resolving a free variable.  test_scope's testLocalsClass
! asserts exactly that absence.
!
! CallAst >> printLocalsCallOn: now branches on ``inClassBodyValueEmit'' -- the
! flag ClassDefAst already sets while emitting attribute value expressions -- and
! builds the dict from ``classBodyBoundNames'', the per-attribute set ClassDefAst
! already computes so that a class body's sequential execution order is
! respected.  So a name bound LATER in the body is correctly absent too
! (testOnlyNamesBoundSoFar).
!
! KNOWN GAPS, deliberate and documented on the emitting method rather than
! papered over:
!
!   * It is a SNAPSHOT.  Grail compiles class bodies to static attribute stores
!     rather than executing them into a real mapping, so ``locals()['x'] = 43''
!     cannot bind a class attribute -- test_scope's
!     testClassNamespaceOverridesClosure and testClassAndGlobal still fail.
!   * CPython seeds a class namespace with __module__ / __qualname__ /
!     __firstlineno__; Grail reports only the names the body itself binds.  The
!     fixtures filter dunders on both sides so the comparison is honest.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/class_body_locals.py under it directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyLocalsTestCase removeAllMethods.
ClassBodyLocalsTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: ClassBodyLocalsTestCase
setUp
	"Reload tests/python/class_body_locals.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_locals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_locals.py')
		name: 'class_body_locals'.
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testEnclosingLocalIsNotInClassLocals
	"THE BUG.  ``x'' is a local of the enclosing def.  A class body does not see
	it, so it must not appear in the class body's locals() -- and ``y'' and the
	method ``m'', which the body DOES bind, must.  Grail answered the enclosing
	function's locals here, which listed ``x'' and not ``y''."

	self assert: testModule @env1:enclosing_local_is_not_in_class_locals asArray
		equals: #( 'm' 'y' ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testOnlyNamesBoundSoFar
	"A class body executes sequentially, so locals() reports what is bound at
	THAT POINT: ``b'' is absent from the earlier call and present in the later
	one, which also sees the name the earlier call bound."

	self assert: testModule @env1:only_names_bound_so_far asArray first asArray
		equals: #( 'a' ).
	self assert: testModule @env1:only_names_bound_so_far asArray last asArray
		equals: #( 'a' 'b' 'early' ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testMethodsAreIncluded
	"A sibling ``def'' is a class-body binding like any other."

	self assert: testModule @env1:methods_are_included asArray
		equals: #( 'm' ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testCallingLocalsDoesNotPollute
	"testLocalsClass's first half: calling locals() must not insert a free
	variable into the class namespace, so the class attribute ``x'' keeps the
	12 the body assigned rather than the enclosing 1."

	self assert: testModule @env1:calling_locals_does_not_pollute equals: 12.
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testVarsWithNoArgumentAgrees
	"Zero-arg vars() is locals() by definition, in a class body too -- both
	spellings go through the same rewrite."

	self assert: testModule @env1:vars_with_no_argument_agrees asArray
		equals: #( 'a' 'b' ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testFunctionLocalsStillWorkInsideAMethod
	"A method body is a FUNCTION scope, so locals() there is unchanged.  The
	class-body branch keys off ``inClassBodyValueEmit'', which is false while
	method bodies are emitted even though classBeingCompiled is still set --
	getting that wrong would have captured every method's locals() too."

	self assert: testModule @env1:function_locals_still_work_inside_a_method asArray
		equals: #( 'a' 'b' ).
%
