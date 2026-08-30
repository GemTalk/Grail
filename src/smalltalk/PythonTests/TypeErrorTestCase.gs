! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypeErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
TypeErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypeErrorTestCase - Tests for Python TypeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypeErrorTestCase removeAllMethods.
TypeErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
test_creation
	"Test creating a TypeError instance."
	
	| exc |
	exc := TypeError ___new___:  TypeError .
	self assert: exc notNil.
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
test_inheritance
	"Test that TypeError inherits from Exception."
	
	| exc |
	exc := TypeError ___new___:  TypeError .
	self assert: (exc isKindOf: Exception).
%

! ===============================================================================
! Subscripting a non-subscriptable object.
!
! ``(1.5)[0:2]'', ``True[0]'', ``object()[0]'', ``{1,2}[0]'', ``...[0]'' all
! raised a Smalltalk MessageNotUnderstood -- an error Python's ``except'' cannot
! see, so instead of being handled it took the process down.  CPython raises a
! catchable ``TypeError: 'float' object is not subscriptable''.
!
! The guard existed three times over as a PER-CLASS method (int, NoneType,
! PythonInstance) and was simply missing for everything else.  It is now one
! fallback in Object >> doesNotUnderstand:args:envId:, beside the __setitem__ /
! __delitem__ / __contains__ intercepts already there.
!
! Fixture: tests/python/subscript_typeerror.py -- which is SELF-RUNNING, so
! scripts/check_python_fixtures.sh proves every expectation below against real
! CPython rather than against Grail's current behaviour.
!
! NOTE ON FAILURE MODES: a regression here does not make these tests FAIL, it
! makes them ERROR.  A MessageNotUnderstood is invisible to the fixture's
! ``except BaseException'', so the fixture function never returns.
! ===============================================================================

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
loadSubscriptFixture
	"Load tests/python/subscript_typeerror.py fresh."

	importlib @env1:modules removeKey: #'subscript_typeerror' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/subscript_typeerror.py')
		name: 'subscript_typeerror'
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
testEverySubscriptShapeMatchesCPython
	"The whole swept matrix in one assertion -- read, assign and delete across
	int / float / bool / complex / None / object() / a plain instance / set /
	frozenset / ellipsis, plus str, bytes, tuple and range for the assignment
	and deletion wordings, plus positive and negative controls.

	Reported as ROWS, not a count: the value a check actually got is the whole
	diagnosis.  The count is asserted separately, because ``no failures'' out
	of an empty table is a well-formed number describing nothing."

	| mod |
	mod := self loadSubscriptFixture.
	self assert: (mod @env1:check_count) > 40.
	self assert: (mod @env1:failures) equals: ''
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
testFloatSubscriptIsACatchableTypeError
	"The headline shape, named on its own so a failure says which one."

	self
		assert: (self loadSubscriptFixture @env1:slice_float)
		equals: 'TypeError: ''float'' object is not subscriptable'
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
testBoolSubscriptIsACatchableTypeError

	self
		assert: (self loadSubscriptFixture @env1:read_bool)
		equals: 'TypeError: ''bool'' object is not subscriptable'
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
testBareObjectSubscriptIsACatchableTypeError

	self
		assert: (self loadSubscriptFixture @env1:read_object)
		equals: 'TypeError: ''object'' object is not subscriptable'
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
testSetSubscriptIsACatchableTypeError

	self
		assert: (self loadSubscriptFixture @env1:read_set)
		equals: 'TypeError: ''set'' object is not subscriptable'
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
testItemErrorsNameThePythonTypeNotTheSmalltalkOne
	"``x[0] = 1'' on a float said ``'SmallDouble' object does not support item
	assignment'' -- the Smalltalk class behind the built-in, leaked into a
	Python error message.  Named through type(x).__name__ now, which Grail
	already answers correctly for every built-in, so this is derived rather
	than a second table to keep in step with the first."

	| mod |
	mod := self loadSubscriptFixture.
	self assert: (mod @env1:set_float)
		equals: 'TypeError: ''float'' object does not support item assignment'.
	self assert: (mod @env1:set_int)
		equals: 'TypeError: ''int'' object does not support item assignment'.
	self assert: (mod @env1:set_str)
		equals: 'TypeError: ''str'' object does not support item assignment'.
	self assert: (mod @env1:set_range)
		equals: 'TypeError: ''range'' object does not support item assignment'.
	self assert: (mod @env1:del_bytes)
		equals: 'TypeError: ''bytes'' object doesn''t support item deletion'
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
testSlicingAFloatInsideTryExceptIsCaught
	"The real-world blocker: kaggle_models_extended.py:231 slices a value that
	turns out to be a float, inside ``try: ... except: pass''.  CPython catches
	it and moves on; Grail died before reaching the handler."

	self
		assert: (self loadSubscriptFixture @env1:kaggle_shape)
		equals: 'caught'
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
testARealGetitemIsNotShadowedByTheFallback
	"NEGATIVE CONTROL.  A fallback that fired too eagerly would satisfy every
	check above and still be wrong.  A class that HAS __getitem__ must answer
	its own value, and an exception raised by that __getitem__ must surface
	unchanged rather than being repainted as a TypeError."

	| mod |
	mod := self loadSubscriptFixture.
	self assert: (mod @env1:neg_real_getitem_wins) equals: '(''got'', 3)'.
	self assert: (mod @env1:neg_real_getitem_raises_its_own)
		equals: 'KeyError: ''missing'''.
	self assert: (mod @env1:neg_real_setitem_and_delitem)
		equals: '(''v'', False)'
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
testTheFallbackDoesNotInventAGetitemAttribute
	"NEGATIVE CONTROL, and the discriminator between the two ways this fix
	could have been written.  A real ``object >> __getitem__:'' would make
	``hasattr(x, '__getitem__')'' answer true for every object alive -- CPython
	says false -- and every ownership probe in the tree would then have to
	unlearn it.  A dispatch-failure fallback leaves attribute lookup exactly as
	it was: object(), set and frozenset, the receivers this change newly
	covers, still report no __getitem__ attribute at all.

	float and bool are deliberately not probed here; Grail already answers true
	for them because an instance attribute load reaches the CLASS-side
	__getitem__: Subscript.gs installs on Float/Integer/Boolean.  That leak
	predates this change and is recorded in docs/Issues.md -- probing it would
	make this control fail for a reason it is not about.

	The fourth element is the control for the other direction: a class that
	really has one still reports it."

	self
		assert: (self loadSubscriptFixture @env1:neg_no_phantom_getitem_attribute)
		equals: '(False, False, False, True)'
%

category: 'Grail-Tests-TypeError'
method: TypeErrorTestCase
testSubscriptingThatShouldWorkStillWorks
	"The other direction: list / tuple / str / bytes / dict / bytearray / range
	read, slice, assign and delete exactly as before."

	| mod |
	mod := self loadSubscriptFixture.
	self assert: (mod @env1:pos_list) equals: '[2, [2, 3], 9, 2]'.
	self assert: (mod @env1:pos_tuple) equals: '(2, (2, 3))'.
	self assert: (mod @env1:pos_str) equals: '(''b'', ''bc'')'.
	self assert: (mod @env1:pos_bytes) equals: '(98, b''bc'')'.
	self assert: (mod @env1:pos_dict) equals: '(''a'', ''z'', False)'.
	self assert: (mod @env1:pos_bytearray) equals: '(98, 9, False)'.
	self assert: (mod @env1:pos_range) equals: '(1, range(1, 3))'
%
