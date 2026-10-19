Class {
	#name : 'DequeIdentitySearchTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Deque' }
DequeIdentitySearchTestCase >> assertResult: aKey equals: expected [
	self assert: (self results @env1:__getitem__: aKey) equals: expected

]

{ #category : 'Grail-Tests-Deque' }
DequeIdentitySearchTestCase >> results [
	"Load tests/python/deque_identity_search.py fresh."

	| mod |
	importlib @env1:modules removeKey: #'deque_identity_search' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/deque_identity_search.py')
		name: 'deque_identity_search'.
	^ mod @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Tests-Deque' }
DequeIdentitySearchTestCase >> testIdentityIsNotConfusedWithSameClass [
	"A DIFFERENT never-equal instance is genuinely absent — the short-circuit is
	``is'', not ``same type''."

	self assertResult: 'other_never_eq_absent' equals: 'False'

]

{ #category : 'Grail-Tests-Deque' }
DequeIdentitySearchTestCase >> testMissingValueMessages [
	"CPython names the method in both messages rather than repr'ing the value."

	self assertResult: 'eq_index_missing'
		equals: 'ValueError: deque.index(x): x not in deque'.
	self assertResult: 'eq_remove_missing'
		equals: 'ValueError: deque.remove(x): x not in deque'

]

{ #category : 'Grail-Tests-Deque' }
DequeIdentitySearchTestCase >> testNanIsFoundByEverySearch [
	"nan is not equal to itself, so only the identity short-circuit can find it.
	This is the exact assertion CPython's test_contains makes."

	self assertResult: 'nan_in' equals: 'True'.
	self assertResult: 'nan_count' equals: '2'.
	self assertResult: 'nan_index' equals: '1'.
	self assertResult: 'nan_remove' equals: '[1, 2]'

]

{ #category : 'Grail-Tests-Deque' }
DequeIdentitySearchTestCase >> testNeverEqualObjectIsFoundByEverySearch [
	"The general form of the same rule: an object whose __eq__ always answers
	False is still found when the deque holds THAT object."

	self assertResult: 'never_eq_in' equals: 'True'.
	self assertResult: 'never_eq_count' equals: '2'.
	self assertResult: 'never_eq_index' equals: '1'.
	self assertResult: 'never_eq_remove' equals: '[1]'

]

{ #category : 'Grail-Tests-Deque' }
DequeIdentitySearchTestCase >> testOrdinaryEqualitySearchingIsUnchanged [
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

]
