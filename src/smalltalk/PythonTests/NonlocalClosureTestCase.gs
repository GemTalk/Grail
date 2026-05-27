! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NonlocalClosureTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NonlocalClosureTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NonlocalClosureTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NonlocalClosureTestCase
!
! Regression for the ``nonlocal'' statement.
!
! Pre-fix, ``nonlocal x'' was a no-op declaration: the parser still
! registered ``x'' in the inner function's variable + write sets,
! so a subsequent ``x = expr'' got a fresh Smalltalk temp that
! shadowed the outer scope's binding.  The outer's ``x'' stayed
! at its original value regardless of the inner's mutations.
!
! Fix: parser tracks declared nonlocal names per scope and strips
! them from the variable + write sets when popScope returns —
! Smalltalk closure capture then routes assignments to the outer's
! location automatically.
!
! Originally surfaced inside werkzeug.test.run_wsgi_app's
! ``start_response'' closure (the WSGI inversion-of-control idiom).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NonlocalClosureTestCase removeAllMethods.
NonlocalClosureTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NonlocalClosureTestCase
setUp
	"Load tests/python/nonlocal_closure.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'nonlocal_closure' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nonlocal_closure.py')
		name: 'nonlocal_closure'.
%

category: 'Grail-Tests'
method: NonlocalClosureTestCase
testClosureAssignReachesOuter
	"``nonlocal captured; captured = X'' in an inner def writes to
	the outer's binding via Smalltalk closure capture."

	self assert: testModule @env1:closure_assign_reaches_outer equals: true
%

category: 'Grail-Tests'
method: NonlocalClosureTestCase
testTwoNonlocals
	"``nonlocal a, b'' declares both names — independent mutations
	each reach their respective outer bindings."

	self assert: testModule @env1:two_nonlocals equals: true
%

category: 'Grail-Tests'
method: NonlocalClosureTestCase
testClosureViaCallback
	"A nonlocal-mutating closure passed elsewhere as a callable
	still writes to the original outer binding."

	self assert: testModule @env1:closure_via_callback equals: true
%

category: 'Grail-Tests'
method: NonlocalClosureTestCase
testWsgiLikePattern
	"The exact pattern that werkzeug.test.run_wsgi_app uses for
	its ``start_response'' closure (the WSGI inversion-of-control
	idiom)."

	self assert: testModule @env1:wsgi_like_pattern equals: true
%
