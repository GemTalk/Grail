! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SetTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SetTestCase - Tests for Python set type
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
SetTestCase removeAllMethods: 0.
SetTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - String Representation'
method: SetTestCase
testEmptySetRepr
	"Test string representation of empty set"

	| s repr |
	s := set new.

	repr := s @env1:__repr__.

	self assert: repr equals: 'set()'
%

category: 'Grail-Tests - Eval - Set Operations'
method: SetTestCase
testEvalSetContains
	"Test in operator for sets via Python source"

	self assert: (self eval: '2 in {1, 2, 3}').
	self deny: (self eval: '4 in {1, 2, 3}').
%

category: 'Grail-Tests - Eval - Set Operations'
method: SetTestCase
testEvalSetDifference
	"Test set - set via Python source"

	| result |
	result := self eval: '{1, 2, 3} - {2, 3, 4}'.
	self assert: result size equals: 1.
	self assert: (result includes: 1).
%

category: 'Grail-Tests - Eval - Set Operations'
method: SetTestCase
testEvalSetIntersection
	"Test set & set via Python source"

	| result |
	result := self eval: '{1, 2, 3} & {2, 3, 4}'.
	self assert: result size equals: 2.
	self assert: (result includes: 2).
	self assert: (result includes: 3).
%

category: 'Grail-Tests - Eval - Set Operations'
method: SetTestCase
testEvalSetLen
	"Test len() on sets via Python source"

	self assert: (self eval: 'len({1, 2, 3})') equals: 3.
	self assert: (self eval: 'len({1, 1, 1})') equals: 1.
%

category: 'Grail-Tests - Eval - Set Creation'
method: SetTestCase
testEvalSetLiteral
	"Test set literal creation via Python source"

	| result |
	result := self eval: '{1, 2, 3}'.
	self assert: result size equals: 3.
	self assert: (result includes: 1).
	self assert: (result includes: 2).
	self assert: (result includes: 3).
%

category: 'Grail-Tests - Eval - Set Operations'
method: SetTestCase
testEvalSetSymmetricDifference
	"Test set ^ set via Python source"

	| result |
	result := self eval: '{1, 2, 3} ^ {2, 3, 4}'.
	self assert: result size equals: 2.
	self assert: (result includes: 1).
	self assert: (result includes: 4).
%

category: 'Grail-Tests - Eval - Set Operations'
method: SetTestCase
testEvalSetUnion
	"Test set | set via Python source"

	| result |
	result := self eval: '{1, 2} | {2, 3}'.
	self assert: result size equals: 3.
	self assert: (result includes: 1).
	self assert: (result includes: 2).
	self assert: (result includes: 3).
%

category: 'Grail-Tests - Eval - Set Creation'
method: SetTestCase
testEvalSetUniqueness
	"Test that set literals deduplicate via Python source"

	| result |
	result := self eval: '{1, 1, 2, 2, 3}'.
	self assert: result size equals: 3.
%

category: 'Grail-Tests - Mutation'
method: SetTestCase
testSetAdd
	"Test adding elements to a set"

	| s |
	s := set new.
	
	s @env1:add: 1.
	self assert: s size equals: 1.
	self assert: (s @env1:__contains__: 1).
	
	s @env1:add: 2.
	self assert: s size equals: 2.
	
	"Adding duplicate should not increase size"
	s @env1:add: 1.
	self assert: s size equals: 2
%

category: 'Grail-Tests - Mutation'
method: SetTestCase
testSetClear
	"Test clearing a set"

	| s |
	s := set new.
	s @env1:add: 1.
	s @env1:add: 2.
	s @env1:add: 3.
	
	s @env1:clear.
	self assert: s size equals: 0
%

category: 'Grail-Tests - Creation'
method: SetTestCase
testSetCreation
	"Test creating sets"

	| s1 s2 |
	s1 := set new.
	s2 := set new.
	
	s2 @env1:add: 1.
	s2 @env1:add: 2.
	s2 @env1:add: 3.
	
	self assert: s1 size equals: 0.
	self assert: s2 size equals: 3
%

category: 'Grail-Tests - Update Methods'
method: SetTestCase
testSetDifferenceUpdate
	"Test difference_update method"

	| s1 s2 |
	s1 := set new.
	s1 @env1:add: 1.
	s1 @env1:add: 2.
	s1 @env1:add: 3.

	s2 := set new.
	s2 @env1:add: 2.
	s2 @env1:add: 4.

	s1 @env1:difference_update: s2.

	self assert: s1 size equals: 2.
	self assert: (s1 @env1:__contains__: 1).
	self assert: (s1 @env1:__contains__: 3).
	self deny: (s1 @env1:__contains__: 2)
%

category: 'Grail-Tests - Mutation'
method: SetTestCase
testSetDiscard
	"Test discarding elements from a set"

	| s |
	s := set new.
	s @env1:add: 1.
	s @env1:add: 2.
	
	s @env1:discard: 2.
	self assert: s size equals: 1.
	
	"Discarding non-existent element should not raise error"
	s @env1:discard: 99.
	self assert: s size equals: 1
%

category: 'Grail-Tests - Inheritance'
method: SetTestCase
testSetAndFrozensetAreSiblings
	"set and frozenset are siblings under GemStone Set, not parent/child.
	This matches CPython, where isinstance distinguishes them."

	| s fs |
	s := set new.
	fs := frozenset new.

	self assert: (s isKindOf: set).
	self assert: (fs isKindOf: frozenset).
	self deny: (s isKindOf: frozenset).
	self deny: (fs isKindOf: set)
%

category: 'Grail-Tests - In-Place Operators'
method: SetTestCase
testSetInPlaceOperators
	"Test in-place set operators (&=, |=, -=, ^=)"

	| s1 s2 result |

	"Test &= (intersection)"
	s1 := set new.
	s1 @env1:add: 1.
	s1 @env1:add: 2.
	s1 @env1:add: 3.

	s2 := set new.
	s2 @env1:add: 2.
	s2 @env1:add: 3.

	result := s1 @env1:__iand__: s2.
	self assert: result == s1.
	self assert: s1 size equals: 2.

	"Test |= (union)"
	s1 := set new.
	s1 @env1:add: 1.

	s2 := set new.
	s2 @env1:add: 2.

	result := s1 @env1:__ior__: s2.
	self assert: result == s1.
	self assert: s1 size equals: 2.

	"Test -= (difference)"
	s1 := set new.
	s1 @env1:add: 1.
	s1 @env1:add: 2.

	s2 := set new.
	s2 @env1:add: 2.

	result := s1 @env1:__isub__: s2.
	self assert: result == s1.
	self assert: s1 size equals: 1.

	"Test ^= (symmetric difference)"
	s1 := set new.
	s1 @env1:add: 1.
	s1 @env1:add: 2.

	s2 := set new.
	s2 @env1:add: 2.
	s2 @env1:add: 3.

	result := s1 @env1:__ixor__: s2.
	self assert: result == s1.
	self assert: s1 size equals: 2
%

category: 'Grail-Tests - Update Methods'
method: SetTestCase
testSetIntersectionUpdate
	"Test intersection_update method"

	| s1 s2 |
	s1 := set new.
	s1 @env1:add: 1.
	s1 @env1:add: 2.
	s1 @env1:add: 3.

	s2 := set new.
	s2 @env1:add: 2.
	s2 @env1:add: 3.
	s2 @env1:add: 4.

	s1 @env1:intersection_update: s2.

	self assert: s1 size equals: 2.
	self assert: (s1 @env1:__contains__: 2).
	self assert: (s1 @env1:__contains__: 3).
	self deny: (s1 @env1:__contains__: 1)
%

category: 'Grail-Tests - Iteration'
method: SetTestCase
testSetIteration
	"Test iterating over a set"

	| s iter items |
	s := set new.
	s @env1:add: 1.
	s @env1:add: 2.
	s @env1:add: 3.
	
	iter := s @env1:__iter__.
	self assert: (iter class) name equals: #'set_iterator'.
	
	items := list new.
	[true] whileTrue: [
		| item |
		[
			item := iter @env1:__next__.
			items @env1:append: item
		] on: StopIteration do: [:ex | ^ nil]
	].
	
	self assert: items size equals: 3
%

category: 'Grail-Tests - Hashing'
method: SetTestCase
testSetNotHashable
	"Test that set is not hashable"

	| s |
	s := set new.
	s @env1:add: 1.

	self should: [s @env1:__hash__] raise: TypeError
%

category: 'Grail-Tests - Mutation'
method: SetTestCase
testSetPop
	"Test popping an element from a set"

	| s item |
	s := set new.
	s @env1:add: 1.
	s @env1:add: 2.
	
	item := s @env1:pop.
	self assert: s size equals: 1.
	self assert: ((item = 1) or: [item = 2]).
	
	s @env1:pop.
	self assert: s size equals: 0.
	
	"Popping from empty set should raise KeyError"
	self should: [s @env1:pop] raise: KeyError
%

category: 'Grail-Tests - Mutation'
method: SetTestCase
testSetRemove
	"Test removing elements from a set"

	| s |
	s := set new.
	s @env1:add: 1.
	s @env1:add: 2.
	s @env1:add: 3.
	
	s @env1:remove: 2.
	self assert: s size equals: 2.
	self deny: (s @env1:__contains__: 2).
	
	"Removing non-existent element should raise KeyError"
	self should: [s @env1:remove: 99] raise: KeyError
%

category: 'Grail-Tests - String Representation'
method: SetTestCase
testSetRepr
	"Test string representation of set"

	| s repr |
	s := set new.
	s @env1:add: 1.
	s @env1:add: 2.

	repr := s @env1:__repr__.

	self assert: (repr includesString: '{').
	self assert: (repr includesString: '}')
%

category: 'Grail-Tests - Update Methods'
method: SetTestCase
testSetSymmetricDifferenceUpdate
	"Test symmetric_difference_update method"

	| s1 s2 |
	s1 := set new.
	s1 @env1:add: 1.
	s1 @env1:add: 2.
	s1 @env1:add: 3.

	s2 := set new.
	s2 @env1:add: 2.
	s2 @env1:add: 3.
	s2 @env1:add: 4.

	s1 @env1:symmetric_difference_update: s2.

	self assert: s1 size equals: 2.
	self assert: (s1 @env1:__contains__: 1).
	self assert: (s1 @env1:__contains__: 4).
	self deny: (s1 @env1:__contains__: 2).
	self deny: (s1 @env1:__contains__: 3)
%

category: 'Grail-Tests - Creation'
method: SetTestCase
testSetUniqueness
	"Test that sets only store unique elements"

	| s |
	s := set new.
	s @env1:add: 1.
	s @env1:add: 1.
	s @env1:add: 2.
	s @env1:add: 2.
	s @env1:add: 2.
	
	self assert: s size equals: 2
%

category: 'Grail-Tests - Update Methods'
method: SetTestCase
testSetUpdate
	"Test updating a set with elements from another"

	| s1 s2 |
	s1 := set new.
	s1 @env1:add: 1.
	s1 @env1:add: 2.

	s2 := set new.
	s2 @env1:add: 2.
	s2 @env1:add: 3.
	s2 @env1:add: 4.

	s1 @env1:update: s2.

	self assert: s1 size equals: 4.
	self assert: (s1 @env1:__contains__: 1).
	self assert: (s1 @env1:__contains__: 2).
	self assert: (s1 @env1:__contains__: 3).
	self assert: (s1 @env1:__contains__: 4)
%
