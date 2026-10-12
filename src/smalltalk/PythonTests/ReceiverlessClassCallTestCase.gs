! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReceiverlessClassCallTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReceiverlessClassCallTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReceiverlessClassCallTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReceiverlessClassCallTestCase
!
! ``Cls.f(...)'' for a def whose parameters do not start with a name Grail can
! make the receiver: ``def f(*a)'', ``def f(*, x)'', ``def f(**kw)''.  Python 3
! calls the plain function.  Grail asked the class for the unary method ``f'',
! which such a def does not compile to, and the kernel's LookupError 2021
! escaped every Python handler and ended the program.
!
! UnboundMethod >> ___callReceiverless___:kw:orSignal: now runs the form the
! class compiled against UnboundMethod ___noReceiver___, which FunctionDefAst's
! *vararg binding leaves out of the tuple; object >>
! ___grailCellFromReceiverFrames___: finds a closure cell the receiver's class
! chain cannot.
!
! Driven by tests/python/receiverless_class_call.py, whose EXPECTED table is
! CPython 3.14's output.  Its KNOWN_DIVERGENCES are pinned as still diverging,
! so a fix that closes one has to move it into EXPECTED.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReceiverlessClassCallTestCase removeAllMethods.
ReceiverlessClassCallTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ReceiverlessClassCallTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'receiverless_class_call' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/receiverless_class_call.py')
		name: 'receiverless_class_call'.
%

category: 'Grail-Setup'
method: ReceiverlessClassCallTestCase
tearDown
	(importlib @env1:modules) removeKey: #'receiverless_class_call' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ReceiverlessClassCallTestCase
result: aKey
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey
%

category: 'Grail-Private'
method: ReceiverlessClassCallTestCase
assertMatchesCPython: aKey
	| actual expected |
	actual := self result: aKey.
	expected := (testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey.
	self
		assert: (actual @env1:__eq__: expected) == true
		description: aKey , ': ' , (builtins @env1:instance @env1:repr: actual) asString
%

category: 'Grail-Tests'
method: ReceiverlessClassCallTestCase
testEveryResultIsChecked
	"Every key the fixture records is either expected or a known divergence."

	| r expected known |
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	known := testModule @env1:___pyAttrLoad___: #KNOWN_DIVERGENCES.
	self assert: (r @env1:__len__) = ((expected @env1:__len__) + (known @env1:__len__)).
	self assert: (expected @env1:__len__) >= 19
%

category: 'Grail-Tests'
method: ReceiverlessClassCallTestCase
testTheOriginalCrashIsAnOrdinaryCall
	"``make(1).f()'' with ``def f(*a)'' in a method-local class: the LookupError
	2021 that no handler could see."

	self assertMatchesCPython: 'uncaught_used_to_escape'.
	self assertMatchesCPython: 'closure_called_inside'
%

category: 'Grail-Tests'
method: ReceiverlessClassCallTestCase
testStarArgsSeeOnlyTheArguments
	self assertMatchesCPython: 'star_no_args'.
	self assertMatchesCPython: 'star_int_args'.
	self assertMatchesCPython: 'star_object_args'.
	self assertMatchesCPython: 'star_bound_later'.
	self assertMatchesCPython: 'star_getattr'
%

category: 'Grail-Tests'
method: ReceiverlessClassCallTestCase
testAnInstanceIsStillArgsZero
	self assertMatchesCPython: 'star_on_instance'.
	self assertMatchesCPython: 'closure_instance'.
	self assertMatchesCPython: 'inherited'
%

category: 'Grail-Tests'
method: ReceiverlessClassCallTestCase
testKeywordArgumentsReachTheBody
	self assertMatchesCPython: 'star_kwargs'.
	self assertMatchesCPython: 'kwonly'.
	self assertMatchesCPython: 'kwonly_missing'.
	self assertMatchesCPython: 'kwonly_positional'.
	self assertMatchesCPython: 'no_params'.
	self assertMatchesCPython: 'no_params_kwarg'.
	"Through an instance the instance is an argument too many (#1434)."
	self assertMatchesCPython: 'instance_extra_arg'
%

category: 'Grail-Tests'
method: ReceiverlessClassCallTestCase
testClosureCellsWithoutAnInstance
	self assertMatchesCPython: 'closure'.
	self assertMatchesCPython: 'closure_foreign_receiver'
%

category: 'Grail-Tests'
method: ReceiverlessClassCallTestCase
testKnownDivergencesStillDiverge
	"Each is a catchable TypeError where CPython answers, or an answer where
	CPython raises.  Closing one is welcome; it then belongs in EXPECTED."

	| known |
	known := testModule @env1:___pyAttrLoad___: #KNOWN_DIVERGENCES.
	#('receiver_default' 'packed_int_receiver') do: [:k |
		self
			deny: ((self result: k) @env1:__eq__: (known @env1:__getitem__: k)) == true
			description: k , ' now matches CPython; move it to EXPECTED']
%
