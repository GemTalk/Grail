! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NestedUnpackTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NestedUnpackTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
NestedUnpackTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedUnpackTestCase — sequence-unpacking assignment where the bug is NOT
! visible at the top level of the statement.
!
! Two independent roots, both reached by CPython's test_iter test_unpack_iter:
!
!   * a NESTED target (``(a, b), (c,) = ...'') skipped the iterable coercion
!     and the value-count check that the top-level target runs, and a nested
!     STAR target did not compile at all;
!   * ___unpackSequence___ fast-pathed every MAPPING, whose __getitem__ is
!     keyed rather than positional, so ``a, b = {1: 'x', 2: 'y'}'' raised
!     ``KeyError: 0'' instead of binding the dict's KEYS.
!
! Fixture: tests/python/nested_unpack.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NestedUnpackTestCase removeAllMethods.
NestedUnpackTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
loadFixture
	"Load tests/python/nested_unpack.py fresh."

	importlib @env1:modules removeKey: #'nested_unpack' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nested_unpack.py')
		name: 'nested_unpack'
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
assert: aPyTuple isTuple: anArray
	"Compare a Python tuple/list against a Smalltalk Array element-wise."

	self assert: aPyTuple @env1:__len__ equals: anArray size.
	anArray doWithIndex: [:each :i |
		self assert: (aPyTuple @env1:__getitem__: i - 1) equals: each]
%

! --- 1. nested target with a non-subscriptable iterable ----------------------

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testNestedIterableTarget
	"``(a, b), (c,) = IteratingSequenceClass(2), {42: 24}'' — the inner
	iterable has __iter__ but NO __getitem__, so the old nested path raised
	``'IteratingSequenceClass' object is not subscriptable''."

	self assert: (self loadFixture @env1:nested_iterable) isTuple: #(0 1 42)
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testNestedDeepTarget
	"Two levels of nesting: the coercion has to reach the INNERMOST target,
	not just the first one."

	self assert: (self loadFixture @env1:nested_deep) isTuple: #(1 2 0 1 5)
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testNestedTargetInForLoop
	"A for-loop target list goes through the same emitter."

	| r |
	r := self loadFixture @env1:nested_in_for_loop.
	self assert: r @env1:__len__ equals: 2.
	self assert: (r @env1:__getitem__: 0) isTuple: #(1 2 3).
	self assert: (r @env1:__getitem__: 1) isTuple: #(4 5 6)
%

! --- 2. nested target value-count check --------------------------------------

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testNestedTooFewRaisesValueError
	"A nested target is as entitled to CPython's ValueError as an outer one;
	before the fix the count was never checked there."

	self
		assert: (self loadFixture @env1:nested_too_few)
		equals: 'ValueError: not enough values to unpack (expected 3, got 2)'
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testNestedTooManyRaisesValueError
	self
		assert: (self loadFixture @env1:nested_too_many)
		equals: 'ValueError: too many values to unpack (expected 2)'
%

! --- 3. nested star target (was a CompileError) ------------------------------

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testNestedStarTarget
	"``(a, *b), c = IteratingSequenceClass(3), 9''.  This one did not merely
	fail — StarredAst fell through to the plain-expression printer, which
	emits a ``*-unpack in call sites is not yet supported'' TypeError signal
	into the LEFT-HAND SIDE of an assignment.  That is a CompileError, so the
	whole enclosing module failed to load."

	| r |
	r := self loadFixture @env1:nested_star.
	self assert: (r @env1:__getitem__: 0) equals: 0.
	self assert: (r @env1:__getitem__: 1) isTuple: #(1 2).
	self assert: (r @env1:__getitem__: 2) equals: 9
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testNestedStarWithTrailingTarget
	"``(a, *b, c), d = [1, 2, 3, 4], 9'' — the star's slice has to stop
	short of the trailing element inside a nested target too."

	| r |
	r := self loadFixture @env1:nested_star_trailing.
	self assert: (r @env1:__getitem__: 0) equals: 1.
	self assert: (r @env1:__getitem__: 1) isTuple: #(2 3).
	self assert: (r @env1:__getitem__: 2) equals: 4.
	self assert: (r @env1:__getitem__: 3) equals: 9
%

! --- 4. a mapping unpacks to its keys ----------------------------------------

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testMappingUnpacksToItsKeys
	"``a, b = {1: 'x', 2: 'y'}'' raised ``KeyError: 0'': a dict owns a real
	__getitem__ so it took the positional fast path, and got asked for key 0.
	CPython iterates it, yielding the KEYS."

	self assert: (self loadFixture @env1:mapping_keys) isTuple: #(1 2)
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testMappingTooManyRaisesValueError
	"With the mapping materialized, the count check applies to it as well —
	it could not fire at all while the dict took the fast path."

	self
		assert: (self loadFixture @env1:mapping_too_many)
		equals: 'ValueError: too many values to unpack (expected 2)'
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testMappingAsNestedTarget
	"Both roots in one statement: a mapping in a nested position."

	self assert: (self loadFixture @env1:mapping_nested) isTuple: #(7 8)
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testMappingItemsView
	"``(k, v), = {7: 8}.items()'' — a one-element outer target whose single
	element is itself a tuple target."

	self assert: (self loadFixture @env1:mapping_items) isTuple: #(7 8)
%

! --- top-level shapes that already worked ------------------------------------

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testTopLevelIterableStillWorks
	self assert: (self loadFixture @env1:flat_iterable) isTuple: #(0 1 2)
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testTopLevelStarStillWorks
	| r |
	r := self loadFixture @env1:flat_star.
	self assert: (r @env1:__getitem__: 0) equals: 1.
	self assert: (r @env1:__getitem__: 1) isTuple: #(2 3).
	self assert: (r @env1:__getitem__: 2) equals: 4
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testTopLevelStringStillWorks
	"A str is a genuine positional sequence and must KEEP the fast path."

	| r |
	r := self loadFixture @env1:flat_string.
	self assert: (r @env1:__getitem__: 0) equals: 'x'.
	self assert: (r @env1:__getitem__: 1) equals: 'y'.
	self assert: (r @env1:__getitem__: 2) equals: 'z'
%

! --- chained targets share the emitter --------------------------------------

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testChainedTupleTargetStillWorks
	"``a, b = c = (1, 2)'' — test_dict's test_popitem shape."

	| r |
	r := self loadFixture @env1:chained_plain.
	self assert: (r @env1:__getitem__: 0) equals: 1.
	self assert: (r @env1:__getitem__: 1) equals: 2.
	self assert: (r @env1:__getitem__: 2) isTuple: #(1 2)
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testChainedStarTarget
	"``a, *b = c = [1, 2, 3]''.  The chained path reaches the unpack through
	the nested-target branch, so it inherited that branch's missing star
	support and emitted a ``*-unpack in call sites is not yet supported''
	TypeError signal into the left-hand side."

	| r |
	r := self loadFixture @env1:chained_star.
	self assert: (r @env1:__getitem__: 0) equals: 1.
	self assert: (r @env1:__getitem__: 1) isTuple: #(2 3).
	self assert: (r @env1:__getitem__: 2) isTuple: #(1 2 3)
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testChainedIterableTarget
	"The chain temp holds the raw iterable; the unpack still has to coerce."

	| r |
	r := self loadFixture @env1:chained_iterable.
	self assert: (r @env1:__getitem__: 0) equals: 0.
	self assert: (r @env1:__getitem__: 1) equals: 1.
	self assert: (r @env1:__getitem__: 2) equals: 'IteratingSequenceClass'
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testChainedTooManyRaisesValueError
	self
		assert: (self loadFixture @env1:chained_too_many)
		equals: 'ValueError: too many values to unpack (expected 2)'
%

category: 'Grail-Tests-NestedUnpack'
method: NestedUnpackTestCase
testNonIterableStillRaisesTypeError
	"``a, b, c = len'' — a BoundMethod carries a PEP-585 generic-alias
	__getitem__ that is not the sequence protocol, so it must still
	materialize via __iter__ and raise CPython's TypeError."

	self
		assert: (self loadFixture @env1:flat_not_iterable)
		equals: 'TypeError: ''BoundMethod'' object is not iterable'
%
