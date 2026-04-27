! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FrozensetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FrozensetTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FrozensetTestCase category: 'SUnit'
%

! ===============================================================================
! FrozensetTestCase - Tests for Python frozenset type
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
FrozensetTestCase removeAllMethods: 0.
FrozensetTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Tests - Copying'
method: FrozensetTestCase
testFrozensetCopy
	"Test copying a frozenset"

	| fs1 fs2 |
	fs1 := frozenset withAll: #(1 2).

	fs2 := fs1 @env1:copy.

	self assert: fs2 size equals: 2.
	self assert: (fs2 @env1:__contains__: 1).
	self assert: (fs2 @env1:__contains__: 2)
%

category: 'Tests - Creation'
method: FrozensetTestCase
testFrozensetCreation
	"Test creating frozensets"

	| fs1 fs2 fs3 |
	fs1 := frozenset new.
	fs2 := frozenset withAll: #(1 2 3).
	fs3 := frozenset withAll: #(1 1 2).

	self assert: fs1 size equals: 0.
	self assert: fs2 size equals: 3.
	self assert: fs3 size equals: 2
%

category: 'Tests - Immutability'
method: FrozensetTestCase
testFrozensetImmutable
	"frozenset instances must be immutable as soon as the constructor returns,
	without waiting for a commit."

	| fs |
	fs := frozenset withAll: #(1 2 3).
	self assert: fs isInvariant.
	self should: [fs add: 4] raise: Error.

	"Empty frozenset is also frozen."
	fs := frozenset new.
	self assert: fs isInvariant.
	self should: [fs add: 1] raise: Error
%

category: 'Tests - Type Identity'
method: FrozensetTestCase
testFrozensetIsNotSet
	"frozenset and set are siblings, not parent/child. isinstance must
	distinguish them."

	| fs s |
	fs := frozenset withAll: #(1 2 3).
	s := set withAll: #(1 2 3).

	self deny: (fs isKindOf: set).
	self deny: (s isKindOf: frozenset)
%

category: 'Tests - Set Operations'
method: FrozensetTestCase
testFrozensetDifference
	"Test difference operation"

	| fs1 fs2 result |
	fs1 := frozenset withAll: #(1 2 3).
	fs2 := frozenset withAll: #(2 4).

	result := fs1 @env1:difference: fs2.

	self assert: result size equals: 2.
	self assert: (result @env1:__contains__: 1).
	self assert: (result @env1:__contains__: 3).
	self deny: (result @env1:__contains__: 2).
	"Result of frozenset op must itself be a frozenset (and frozen)."
	self assert: (result isKindOf: frozenset).
	self assert: result isInvariant
%

category: 'Tests - Comparison'
method: FrozensetTestCase
testFrozensetEquality
	"Test equality comparison"

	| fs1 fs2 fs3 |
	fs1 := frozenset withAll: #(1 2).
	fs2 := frozenset withAll: #(2 1).
	fs3 := frozenset withAll: #(1 3).

	self assert: (fs1 @env1:__eq__: fs2).
	self deny: (fs1 @env1:__eq__: fs3).
	self deny: (fs1 @env1:__ne__: fs2).
	self assert: (fs1 @env1:__ne__: fs3)
%

category: 'Tests - Hashing'
method: FrozensetTestCase
testFrozensetHashable
	"Test that frozenset is hashable"

	| fs1 fs2 hash1 hash2 |
	fs1 := frozenset withAll: #(1 2).
	fs2 := frozenset withAll: #(2 1).

	hash1 := fs1 @env1:__hash__.
	hash2 := fs2 @env1:__hash__.

	"Equal frozensets should have equal hashes"
	self assert: hash1 equals: hash2
%

category: 'Tests - Set Operations'
method: FrozensetTestCase
testFrozensetIntersection
	"Test intersection operation"

	| fs1 fs2 result |
	fs1 := frozenset withAll: #(1 2 3).
	fs2 := frozenset withAll: #(2 3 4).

	result := fs1 @env1:intersection: fs2.

	self assert: result size equals: 2.
	self assert: (result @env1:__contains__: 2).
	self assert: (result @env1:__contains__: 3).
	self deny: (result @env1:__contains__: 1).
	self deny: (result @env1:__contains__: 4)
%

category: 'Tests - Comparison'
method: FrozensetTestCase
testFrozensetIsdisjoint
	"Test isdisjoint operation"

	| fs1 fs2 fs3 |
	fs1 := frozenset withAll: #(1 2).
	fs2 := frozenset withAll: #(3 4).
	fs3 := frozenset withAll: #(2 3).

	self assert: (fs1 @env1:isdisjoint: fs2).
	self deny: (fs1 @env1:isdisjoint: fs3)
%

category: 'Tests - Iteration'
method: FrozensetTestCase
testFrozensetIteration
	"Test iterating over a frozenset"

	| fs iter items |
	fs := frozenset withAll: #(1 2 3).

	iter := fs @env1:__iter__.
	self assert: (iter class) name equals: #'set_iterator'.

	items := list new.
	[true] whileTrue: [
		| item |
		[
			item := iter @env1:__next__.
			items @env1:append: item.
		] on: StopIteration do: [:ex | ^ nil]
	].

	self assert: items size equals: 3.
	self assert: (items @env1:__contains__: 1).
	self assert: (items @env1:__contains__: 2).
	self assert: (items @env1:__contains__: 3)
%

category: 'Tests - Membership'
method: FrozensetTestCase
testFrozensetMembership
	"Test membership testing in frozensets"

	| fs |
	fs := frozenset withAll: #(1 2 3).

	self assert: (fs @env1:__contains__: 1).
	self assert: (fs @env1:__contains__: 2).
	self assert: (fs @env1:__contains__: 3).
	self deny: (fs @env1:__contains__: 4)
%

category: 'Tests - Set Operations (Operators)'
method: FrozensetTestCase
testFrozensetOperators
	"Test set operators (&, |, -, ^)"

	| fs1 fs2 |
	fs1 := frozenset withAll: #(1 2).
	fs2 := frozenset withAll: #(2 3).

	"Test & (intersection)"
	self assert: (fs1 @env1:__and__: fs2) size equals: 1.

	"Test | (union)"
	self assert: (fs1 @env1:__or__: fs2) size equals: 3.

	"Test - (difference)"
	self assert: (fs1 @env1:__sub__: fs2) size equals: 1.

	"Test ^ (symmetric difference)"
	self assert: (fs1 @env1:__xor__: fs2) size equals: 2
%

category: 'Tests - String Representation'
method: FrozensetTestCase
testFrozensetRepr
	"Test string representation of frozenset"

	| fs repr |
	fs := frozenset withAll: #(1 2).

	repr := fs @env1:__repr__.

	self assert: (repr includesString: 'frozenset').
	self assert: (repr includesString: '{').
	self assert: (repr includesString: '}')
%

category: 'Tests - Comparison'
method: FrozensetTestCase
testFrozensetSubsetSuperset
	"Test subset and superset operations"

	| fs1 fs2 fs3 |
	fs1 := frozenset withAll: #(1 2).
	fs2 := frozenset withAll: #(1 2 3).
	fs3 := frozenset withAll: #(1).

	"Test issubset"
	self assert: (fs1 @env1:issubset: fs2).
	self deny: (fs2 @env1:issubset: fs1).

	"Test issuperset"
	self assert: (fs2 @env1:issuperset: fs1).
	self deny: (fs1 @env1:issuperset: fs2).

	"Test <= and >="
	self assert: (fs1 @env1:__le__: fs2).
	self assert: (fs2 @env1:__ge__: fs1).

	"Test < and > (proper subset/superset)"
	self assert: (fs1 @env1:__lt__: fs2).
	self assert: (fs2 @env1:__gt__: fs1).
	self deny: (fs1 @env1:__lt__: fs1)
%

category: 'Tests - Set Operations'
method: FrozensetTestCase
testFrozensetSymmetricDifference
	"Test symmetric difference operation"

	| fs1 fs2 result |
	fs1 := frozenset withAll: #(1 2 3).
	fs2 := frozenset withAll: #(2 3 4).

	result := fs1 @env1:symmetric_difference: fs2.

	self assert: result size equals: 2.
	self assert: (result @env1:__contains__: 1).
	self assert: (result @env1:__contains__: 4).
	self deny: (result @env1:__contains__: 2).
	self deny: (result @env1:__contains__: 3)
%

category: 'Tests - Set Operations'
method: FrozensetTestCase
testFrozensetUnion
	"Test union operation"

	| fs1 fs2 result |
	fs1 := frozenset withAll: #(1 2).
	fs2 := frozenset withAll: #(2 3).

	result := fs1 @env1:union: fs2.

	self assert: result size equals: 3.
	self assert: (result @env1:__contains__: 1).
	self assert: (result @env1:__contains__: 2).
	self assert: (result @env1:__contains__: 3)
%
