! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DequeIdentitySearchTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DequeIdentitySearchTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
DequeIdentitySearchTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DequeIdentitySearchTestCase — deque's element searches must consult IDENTITY
! before __eq__.
!
! Every element search in CPython goes through PyObject_RichCompareBool, which
! returns true immediately when the two operands are the same object.  deque's
! __contains__, count, index and remove compared with == only, so a value that
! is not equal to itself could not be found in a deque that holds it.  nan is
! the standard case — CPython's test_contains asserts nan is found in
! deque([nan]) — and an object whose __eq__ always returns False is the general
! one.
!
! Found by the CPython regression gate (test.test_contains went OK -> FAIL)
! rather than by any Grail test, which is why these now exist.
!
! Expectations captured from CPython 3.14.4 running the same fixture.
!
! Fixture: tests/python/deque_identity_search.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DequeIdentitySearchTestCase removeAllMethods.
DequeIdentitySearchTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Deque'
method: DequeIdentitySearchTestCase
results
	"Load tests/python/deque_identity_search.py fresh."

	| mod |
	importlib @env1:modules removeKey: #'deque_identity_search' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/deque_identity_search.py')
		name: 'deque_identity_search'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests-Deque'
method: DequeIdentitySearchTestCase
assertResult: aKey equals: expected
	self assert: (self results @env1:__getitem__: aKey) equals: expected
%

category: 'Grail-Tests-Deque'
method: DequeIdentitySearchTestCase
testNanIsFoundByEverySearch
	"nan is not equal to itself, so only the identity short-circuit can find it.
	This is the exact assertion CPython's test_contains makes."

	self assertResult: 'nan_in' equals: 'True'.
	self assertResult: 'nan_count' equals: '2'.
	self assertResult: 'nan_index' equals: '1'.
	self assertResult: 'nan_remove' equals: '[1, 2]'
%

category: 'Grail-Tests-Deque'
method: DequeIdentitySearchTestCase
testNeverEqualObjectIsFoundByEverySearch
	"The general form of the same rule: an object whose __eq__ always answers
	False is still found when the deque holds THAT object."

	self assertResult: 'never_eq_in' equals: 'True'.
	self assertResult: 'never_eq_count' equals: '2'.
	self assertResult: 'never_eq_index' equals: '1'.
	self assertResult: 'never_eq_remove' equals: '[1]'
%

category: 'Grail-Tests-Deque'
method: DequeIdentitySearchTestCase
testIdentityIsNotConfusedWithSameClass
	"A DIFFERENT never-equal instance is genuinely absent — the short-circuit is
	``is'', not ``same type''."

	self assertResult: 'other_never_eq_absent' equals: 'False'
%

category: 'Grail-Tests-Deque'
method: DequeIdentitySearchTestCase
testOrdinaryEqualitySearchingIsUnchanged
	"Adding an identity check must not stop == from finding equal-but-distinct
	values, nor disturb which occurrence remove() takes."

	self assertResult: 'eq_in_true' equals: 'True'.
	self assertResult: 'eq_in_false' equals: 'False'.
	self assertResult: 'eq_count' equals: '2'.
	self assertResult: 'eq_index' equals: '2'.
	self assertResult: 'equal_not_identical' equals: 'True'.
	self assertResult: 'equal_str' equals: 'True'.
	self assertResult: 'bool_int_equal' equals: 'True'.
	self assertResult: 'eq_remove_first_only' equals: '[1, 3, 2]'
%

category: 'Grail-Tests-Deque'
method: DequeIdentitySearchTestCase
testMissingValueMessages
	"CPython names the method in both messages rather than repr'ing the value."

	self assertResult: 'eq_index_missing'
		equals: 'ValueError: deque.index(x): x not in deque'.
	self assertResult: 'eq_remove_missing'
		equals: 'ValueError: deque.remove(x): x not in deque'
%
