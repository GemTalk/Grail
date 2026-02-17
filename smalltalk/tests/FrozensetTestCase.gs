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
	fs1 := frozenset new.
	fs1 add: 1.
	fs1 add: 2.

	fs2 := fs1 perform: #copy env: 2.

	self assert: fs2 size equals: 2.
	self assert: (fs2 ___contains___: 1).
	self assert: (fs2 ___contains___: 2)
%

category: 'Tests - Creation'
method: FrozensetTestCase
testFrozensetCreation
	"Test creating frozensets"

	| fs1 fs2 fs3 |
	fs1 := frozenset new.
	fs2 := frozenset new.
	fs3 := frozenset new.
	
	fs2 add: 1.
	fs2 add: 2.
	fs2 add: 3.
	
	fs3 add: 1.
	fs3 add: 1.
	fs3 add: 2.
	
	self assert: fs1 size equals: 0.
	self assert: fs2 size equals: 3.
	self assert: fs3 size equals: 2
%

category: 'Tests - Set Operations'
method: FrozensetTestCase
testFrozensetDifference
	"Test difference operation"

	| fs1 fs2 result |
	fs1 := frozenset new.
	fs1 add: 1.
	fs1 add: 2.
	fs1 add: 3.
	
	fs2 := frozenset new.
	fs2 add: 2.
	fs2 add: 4.
	
	result := fs1 perform: #difference: env: 2 withArguments: {fs2}.
	
	self assert: result size equals: 2.
	self assert: (result ___contains___: 1).
	self assert: (result ___contains___: 3).
	self deny: (result ___contains___: 2)
%

category: 'Tests - Comparison'
method: FrozensetTestCase
testFrozensetEquality
	"Test equality comparison"

	| fs1 fs2 fs3 |
	fs1 := frozenset new.
	fs1 add: 1.
	fs1 add: 2.

	fs2 := frozenset new.
	fs2 add: 2.
	fs2 add: 1.

	fs3 := frozenset new.
	fs3 add: 1.
	fs3 add: 3.

	self assert: (fs1 perform: #__eq__: env: 2 withArguments: {fs2}).
	self deny: (fs1 perform: #__eq__: env: 2 withArguments: {fs3}).
	self deny: (fs1 perform: #__ne__: env: 2 withArguments: {fs2}).
	self assert: (fs1 perform: #__ne__: env: 2 withArguments: {fs3})
%

category: 'Tests - Hashing'
method: FrozensetTestCase
testFrozensetHashable
	"Test that frozenset is hashable"

	| fs1 fs2 hash1 hash2 |
	fs1 := frozenset new.
	fs1 add: 1.
	fs1 add: 2.

	fs2 := frozenset new.
	fs2 add: 2.
	fs2 add: 1.

	hash1 := fs1 perform: #__hash__ env: 2.
	hash2 := fs2 perform: #__hash__ env: 2.

	"Equal frozensets should have equal hashes"
	self assert: hash1 equals: hash2
%

category: 'Tests - Set Operations'
method: FrozensetTestCase
testFrozensetIntersection
	"Test intersection operation"

	| fs1 fs2 result |
	fs1 := frozenset new.
	fs1 add: 1.
	fs1 add: 2.
	fs1 add: 3.
	
	fs2 := frozenset new.
	fs2 add: 2.
	fs2 add: 3.
	fs2 add: 4.
	
	result := fs1 perform: #intersection: env: 2 withArguments: {fs2}.
	
	self assert: result size equals: 2.
	self assert: (result ___contains___: 2).
	self assert: (result ___contains___: 3).
	self deny: (result ___contains___: 1).
	self deny: (result ___contains___: 4)
%

category: 'Tests - Comparison'
method: FrozensetTestCase
testFrozensetIsdisjoint
	"Test isdisjoint operation"

	| fs1 fs2 fs3 |
	fs1 := frozenset new.
	fs1 add: 1.
	fs1 add: 2.

	fs2 := frozenset new.
	fs2 add: 3.
	fs2 add: 4.

	fs3 := frozenset new.
	fs3 add: 2.
	fs3 add: 3.

	self assert: (fs1 perform: #isdisjoint: env: 2 withArguments: {fs2}).
	self deny: (fs1 perform: #isdisjoint: env: 2 withArguments: {fs3})
%

category: 'Tests - Iteration'
method: FrozensetTestCase
testFrozensetIteration
	"Test iterating over a frozenset"

	| fs iter items |
	fs := frozenset new.
	fs add: 1.
	fs add: 2.
	fs add: 3.
	
	iter := fs perform: #__iter__ env: 2.
	self assert: (iter class) name equals: #'set_iterator'.
	
	items := list new.
	[true] whileTrue: [
		| item |
		[
			item := iter perform: #__next__ env: 2.
			items perform: #append: env: 2 withArguments: {item}.
		] on: StopIteration do: [:ex | ^ nil]
	].
	
	self assert: items size equals: 3.
	self assert: (items ___contains___: 1).
	self assert: (items ___contains___: 2).
	self assert: (items ___contains___: 3)
%

category: 'Tests - Membership'
method: FrozensetTestCase
testFrozensetMembership
	"Test membership testing in frozensets"

	| fs |
	fs := frozenset new.
	fs add: 1.
	fs add: 2.
	fs add: 3.
	
	self assert: (fs ___contains___: 1).
	self assert: (fs ___contains___: 2).
	self assert: (fs ___contains___: 3).
	self deny: (fs ___contains___: 4)
%

category: 'Tests - Set Operations (Operators)'
method: FrozensetTestCase
testFrozensetOperators
	"Test set operators (&, |, -, ^)"

	| fs1 fs2 |
	fs1 := frozenset new.
	fs1 add: 1.
	fs1 add: 2.

	fs2 := frozenset new.
	fs2 add: 2.
	fs2 add: 3.

	"Test & (intersection)"
	self assert: (fs1 perform: #__and__: env: 2 withArguments: {fs2}) size equals: 1.

	"Test | (union)"
	self assert: (fs1 perform: #__or__: env: 2 withArguments: {fs2}) size equals: 3.

	"Test - (difference)"
	self assert: (fs1 perform: #__sub__: env: 2 withArguments: {fs2}) size equals: 1.

	"Test ^ (symmetric difference)"
	self assert: (fs1 perform: #__xor__: env: 2 withArguments: {fs2}) size equals: 2
%

category: 'Tests - String Representation'
method: FrozensetTestCase
testFrozensetRepr
	"Test string representation of frozenset"

	| fs repr |
	fs := frozenset new.
	fs add: 1.
	fs add: 2.

	repr := fs perform: #__repr__ env: 2.

	self assert: (repr includesString: 'frozenset').
	self assert: (repr includesString: '{').
	self assert: (repr includesString: '}')
%

category: 'Tests - Comparison'
method: FrozensetTestCase
testFrozensetSubsetSuperset
	"Test subset and superset operations"

	| fs1 fs2 fs3 |
	fs1 := frozenset new.
	fs1 add: 1.
	fs1 add: 2.

	fs2 := frozenset new.
	fs2 add: 1.
	fs2 add: 2.
	fs2 add: 3.

	fs3 := frozenset new.
	fs3 add: 1.

	"Test issubset"
	self assert: (fs1 perform: #issubset: env: 2 withArguments: {fs2}).
	self deny: (fs2 perform: #issubset: env: 2 withArguments: {fs1}).

	"Test issuperset"
	self assert: (fs2 perform: #issuperset: env: 2 withArguments: {fs1}).
	self deny: (fs1 perform: #issuperset: env: 2 withArguments: {fs2}).

	"Test <= and >="
	self assert: (fs1 perform: #__le__: env: 2 withArguments: {fs2}).
	self assert: (fs2 perform: #__ge__: env: 2 withArguments: {fs1}).

	"Test < and > (proper subset/superset)"
	self assert: (fs1 perform: #__lt__: env: 2 withArguments: {fs2}).
	self assert: (fs2 perform: #__gt__: env: 2 withArguments: {fs1}).
	self deny: (fs1 perform: #__lt__: env: 2 withArguments: {fs1})
%

category: 'Tests - Set Operations'
method: FrozensetTestCase
testFrozensetSymmetricDifference
	"Test symmetric difference operation"

	| fs1 fs2 result |
	fs1 := frozenset new.
	fs1 add: 1.
	fs1 add: 2.
	fs1 add: 3.

	fs2 := frozenset new.
	fs2 add: 2.
	fs2 add: 3.
	fs2 add: 4.

	result := fs1 perform: #symmetric_difference: env: 2 withArguments: {fs2}.

	self assert: result size equals: 2.
	self assert: (result ___contains___: 1).
	self assert: (result ___contains___: 4).
	self deny: (result ___contains___: 2).
	self deny: (result ___contains___: 3)
%

category: 'Tests - Set Operations'
method: FrozensetTestCase
testFrozensetUnion
	"Test union operation"

	| fs1 fs2 result |
	fs1 := frozenset new.
	fs1 add: 1.
	fs1 add: 2.
	
	fs2 := frozenset new.
	fs2 add: 2.
	fs2 add: 3.
	
	result := fs1 perform: #union: env: 2 withArguments: {fs2}.
	
	self assert: result size equals: 3.
	self assert: (result ___contains___: 1).
	self assert: (result ___contains___: 2).
	self assert: (result ___contains___: 3)
%
