! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IteratorLengthHintTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IteratorLengthHintTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
IteratorLengthHintTestCase comment:
'Iterator length transparency -- operator.length_hint on an ITERATOR must
report the items it has LEFT, so that len(it) == len(list(it)).

Covers the test.test_iterlen round:
  * __length_hint__ added to range_iterator / tuple_iterator / str_iterator /
    seq_iterator and the three dict iterators (they had none, so
    operator.length_hint silently used its default of 0);
  * reversed(range(n)) answers an ITERATOR, not the reversed range (a range''s
    len is static, so the hint never decreased);
  * the temporarily-immutable types (deque, dict, set) raise RuntimeError when
    mutated mid-iteration and latch their hint to zero -- deque did neither,
    because it handed out a plain list_iterator over its private list;
  * a reverse list iterator whose list SHRINKS under it stops instead of
    indexing past the end (which raised an uncatchable Smalltalk OffsetError);
  * list() / list.extend() / bytearray.extend() ask for a length hint before
    consuming, so an exception from __len__ / __length_hint__ reaches the
    caller instead of being skipped.

See tests/python/iterator_length_hint.py for the fixture behind each test.'
%

expectvalue /Class
doit
IteratorLengthHintTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
IteratorLengthHintTestCase removeAllMethods: 0.
IteratorLengthHintTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: IteratorLengthHintTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'iterator_length_hint' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/iterator_length_hint.py')
		name: 'iterator_length_hint'.
%

category: 'Grail-Helpers'
method: IteratorLengthHintTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Tests - Hint decreases'
method: IteratorLengthHintTestCase
testEveryIteratorReportsItsRemainingCount
	"length_hint over a full walk of each built-in iterator flavour is
	[10, 9, ... 1, 0] and stays 0 after StopIteration.  The fixture answers
	true, or a list of ``name: got'' for each type that disagreed -- so a
	failure names the iterator class."

	self assert: (self resultAt: 'hint_decreases') equals: true
%

category: 'Grail-Tests - Hint decreases'
method: IteratorLengthHintTestCase
testReversedRangeIsAnIteratorNotARange
	"reversed(range(4)) is a range_iterator (CPython), not range(3, -1, -1):
	a range reports a STATIC len, so the hint never decreased.  Also checks
	the reversed-range arithmetic behind it is unchanged."

	self assert: (self resultAt: 'reversed_range_is_iterator') equals: true
%

category: 'Grail-Tests - Temporarily immutable'
method: IteratorLengthHintTestCase
testMutatingDuringIterationRaisesAndZeroesTheHint
	"deque / dict keys / dict items / dict values / set: mutate mid-walk and
	the next __next__ raises RuntimeError, after which the hint is 0
	permanently (the iteration can never be completed, so any other count
	would break len(it) == len(list(it)))."

	self assert: (self resultAt: 'mutation_detected') equals: true
%

category: 'Grail-Tests - Temporarily immutable'
method: IteratorLengthHintTestCase
testDequeDetectsASameSizeMutation
	"A deque iterator compares a mutation COUNTER, not a length, so
	``d.pop(); d.append(x)'' and a bare ``d.rotate(3)'' are caught too -- a
	length check alone would miss both."

	self assert: (self resultAt: 'deque_same_size_mutation') equals: true
%

category: 'Grail-Tests - Mutable during iteration'
method: IteratorLengthHintTestCase
testReverseIteratorStopsWhenItsListShrinks
	"A reverse list iterator ignores an append past its position but reports 0
	-- and drains to [] rather than raising a Smalltalk OffsetError -- once the
	list has been truncated past it.  Exhaustion then latches: re-growing the
	list does not revive it.  The fixture checks the whole
	[8, 8, 0, [], 0] sequence itself and answers the actual list on a
	mismatch, so a failure shows which step drifted."

	self assert: (self resultAt: 'reverse_over_shrunken') equals: true
%

category: 'Grail-Tests - Mutable during iteration'
method: IteratorLengthHintTestCase
testForwardIteratorFollowsAGrowingList
	"The complement, and unchanged: a FORWARD list_iterator's hint grows with
	an append (size - position), where the reverse one ignores it.  Expected
	[8, 9, 0, []]; the fixture answers the actual list on a mismatch."

	self assert: (self resultAt: 'forward_over_growing') equals: true
%

category: 'Grail-Tests - Presize hint'
method: IteratorLengthHintTestCase
testPresizeHintExceptionsReachTheCaller
	"list(x) / [].extend(x) / bytearray.extend(x) ask x for a length hint
	before consuming it, so a __len__ or __length_hint__ that raises
	RuntimeError reaches the caller.  Grail skipped the call entirely, so
	list(BadLen()) quietly answered [0..9]."

	self assert: (self resultAt: 'presize_exceptions') equals: true
%

category: 'Grail-Tests - Presize hint'
method: IteratorLengthHintTestCase
testUnusableHintIsNotAnError
	"The other half: a __length_hint__ answering NotImplemented means ``no
	estimate'', so list() still builds the whole sequence and length_hint
	falls back to the caller's default."

	self assert: (self resultAt: 'unusable_hint') equals: true
%
