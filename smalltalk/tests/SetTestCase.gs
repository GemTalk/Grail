! ===============================================================================
! SetTestCase - Tests for Python set type
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
SetTestCase removeAllMethods: 0.
SetTestCase class removeAllMethods: 0.
%

! ------------------- Test methods for SetTestCase

category: 'Tests - Creation'
method: SetTestCase
testSetCreation
	"Test creating sets"

	| s1 s2 |
	s1 := set new.
	s2 := set new.
	
	s2 ___add___: 1.
	s2 ___add___: 2.
	s2 ___add___: 3.
	
	self assert: (s1 ___len___) equals: 0.
	self assert: (s2 ___len___) equals: 3
%

category: 'Tests - Creation'
method: SetTestCase
testSetUniqueness
	"Test that sets only store unique elements"

	| s |
	s := set new.
	s ___add___: 1.
	s ___add___: 1.
	s ___add___: 2.
	s ___add___: 2.
	s ___add___: 2.
	
	self assert: (s ___len___) equals: 2
%

category: 'Tests - Iteration'
method: SetTestCase
testSetIteration
	"Test iterating over a set"

	| s iter items |
	s := set new.
	s ___add___: 1.
	s ___add___: 2.
	s ___add___: 3.
	
	iter := s perform: #__iter__ env: 2.
	self assert: (iter class) name equals: #'set_iterator'.
	
	items := list new.
	[true] perform: #whileTrue: env: 0 withArguments: {[
		| item |
		[
			item := iter perform: #__next__ env: 2.
			items perform: #append: env: 2 withArguments: {item}
		] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex | ^ nil]}
	]}.
	
	self assert: (items ___len___) equals: 3
%

category: 'Tests - Mutation'
method: SetTestCase
testSetAdd
	"Test adding elements to a set"

	| s |
	s := set new.
	
	s ___add___: 1.
	self assert: (s ___len___) equals: 1.
	self assert: (s ___contains___: 1).
	
	s ___add___: 2.
	self assert: (s ___len___) equals: 2.
	
	"Adding duplicate should not increase size"
	s ___add___: 1.
	self assert: (s ___len___) equals: 2
%

category: 'Tests - Mutation'
method: SetTestCase
testSetRemove
	"Test removing elements from a set"

	| s |
	s := set new.
	s ___add___: 1.
	s ___add___: 2.
	s ___add___: 3.
	
	s perform: #remove: env: 2 withArguments: {2}.
	self assert: (s ___len___) equals: 2.
	self deny: (s ___contains___: 2).
	
	"Removing non-existent element should raise KeyError"
	self should: [s perform: #remove: env: 2 withArguments: {99}] raise: KeyError
%

category: 'Tests - Mutation'
method: SetTestCase
testSetDiscard
	"Test discarding elements from a set"

	| s |
	s := set new.
	s ___add___: 1.
	s ___add___: 2.
	
	s perform: #discard: env: 2 withArguments: {2}.
	self assert: (s ___len___) equals: 1.
	
	"Discarding non-existent element should not raise error"
	s perform: #discard: env: 2 withArguments: {99}.
	self assert: (s ___len___) equals: 1
%

category: 'Tests - Mutation'
method: SetTestCase
testSetPop
	"Test popping an element from a set"

	| s item |
	s := set new.
	s ___add___: 1.
	s ___add___: 2.
	
	item := s perform: #pop env: 2.
	self assert: (s ___len___) equals: 1.
	self assert: ((item perform: #= env: 0 withArguments: {1}) or: [item perform: #= env: 0 withArguments: {2}]).
	
	s perform: #pop env: 2.
	self assert: (s ___len___) equals: 0.
	
	"Popping from empty set should raise KeyError"
	self should: [s perform: #pop env: 2] raise: KeyError
%

category: 'Tests - Mutation'
method: SetTestCase
testSetClear
	"Test clearing a set"

	| s |
	s := set new.
	s ___add___: 1.
	s ___add___: 2.
	s ___add___: 3.
	
	s perform: #clear env: 2.
	self assert: (s ___len___) equals: 0
%

category: 'Tests - Update Methods'
method: SetTestCase
testSetUpdate
	"Test updating a set with elements from another"

	| s1 s2 |
	s1 := set new.
	s1 ___add___: 1.
	s1 ___add___: 2.

	s2 := set new.
	s2 ___add___: 2.
	s2 ___add___: 3.
	s2 ___add___: 4.

	s1 perform: #update: env: 2 withArguments: {s2}.

	self assert: (s1 ___len___) equals: 4.
	self assert: (s1 ___contains___: 1).
	self assert: (s1 ___contains___: 2).
	self assert: (s1 ___contains___: 3).
	self assert: (s1 ___contains___: 4)
%

category: 'Tests - Update Methods'
method: SetTestCase
testSetIntersectionUpdate
	"Test intersection_update method"

	| s1 s2 |
	s1 := set new.
	s1 ___add___: 1.
	s1 ___add___: 2.
	s1 ___add___: 3.

	s2 := set new.
	s2 ___add___: 2.
	s2 ___add___: 3.
	s2 ___add___: 4.

	s1 perform: #intersection_update: env: 2 withArguments: {s2}.

	self assert: (s1 ___len___) equals: 2.
	self assert: (s1 ___contains___: 2).
	self assert: (s1 ___contains___: 3).
	self deny: (s1 ___contains___: 1)
%

category: 'Tests - Update Methods'
method: SetTestCase
testSetDifferenceUpdate
	"Test difference_update method"

	| s1 s2 |
	s1 := set new.
	s1 ___add___: 1.
	s1 ___add___: 2.
	s1 ___add___: 3.

	s2 := set new.
	s2 ___add___: 2.
	s2 ___add___: 4.

	s1 perform: #difference_update: env: 2 withArguments: {s2}.

	self assert: (s1 ___len___) equals: 2.
	self assert: (s1 ___contains___: 1).
	self assert: (s1 ___contains___: 3).
	self deny: (s1 ___contains___: 2)
%

category: 'Tests - Update Methods'
method: SetTestCase
testSetSymmetricDifferenceUpdate
	"Test symmetric_difference_update method"

	| s1 s2 |
	s1 := set new.
	s1 ___add___: 1.
	s1 ___add___: 2.
	s1 ___add___: 3.

	s2 := set new.
	s2 ___add___: 2.
	s2 ___add___: 3.
	s2 ___add___: 4.

	s1 perform: #symmetric_difference_update: env: 2 withArguments: {s2}.

	self assert: (s1 ___len___) equals: 2.
	self assert: (s1 ___contains___: 1).
	self assert: (s1 ___contains___: 4).
	self deny: (s1 ___contains___: 2).
	self deny: (s1 ___contains___: 3)
%

category: 'Tests - In-Place Operators'
method: SetTestCase
testSetInPlaceOperators
	"Test in-place set operators (&=, |=, -=, ^=)"

	| s1 s2 result |

	"Test &= (intersection)"
	s1 := set new.
	s1 ___add___: 1.
	s1 ___add___: 2.
	s1 ___add___: 3.

	s2 := set new.
	s2 ___add___: 2.
	s2 ___add___: 3.

	result := s1 perform: #__iand__: env: 2 withArguments: {s2}.
	self assert: result == s1.
	self assert: (s1 ___len___) equals: 2.

	"Test |= (union)"
	s1 := set new.
	s1 ___add___: 1.

	s2 := set new.
	s2 ___add___: 2.

	result := s1 perform: #__ior__: env: 2 withArguments: {s2}.
	self assert: result == s1.
	self assert: (s1 ___len___) equals: 2.

	"Test -= (difference)"
	s1 := set new.
	s1 ___add___: 1.
	s1 ___add___: 2.

	s2 := set new.
	s2 ___add___: 2.

	result := s1 perform: #__isub__: env: 2 withArguments: {s2}.
	self assert: result == s1.
	self assert: (s1 ___len___) equals: 1.

	"Test ^= (symmetric difference)"
	s1 := set new.
	s1 ___add___: 1.
	s1 ___add___: 2.

	s2 := set new.
	s2 ___add___: 2.
	s2 ___add___: 3.

	result := s1 perform: #__ixor__: env: 2 withArguments: {s2}.
	self assert: result == s1.
	self assert: (s1 ___len___) equals: 2
%

category: 'Tests - Hashing'
method: SetTestCase
testSetNotHashable
	"Test that set is not hashable"

	| s |
	s := set new.
	s ___add___: 1.

	self should: [s perform: #__hash__ env: 2] raise: TypeError
%

category: 'Tests - Inheritance'
method: SetTestCase
testSetInheritsFromFrozenset
	"Test that set inherits from frozenset"

	| s |
	s := set new.

	self assert: (s perform: #isKindOf: env: 0 withArguments: {frozenset}).
	self assert: (s perform: #isKindOf: env: 0 withArguments: {set})
%

category: 'Tests - String Representation'
method: SetTestCase
testSetRepr
	"Test string representation of set"

	| s repr |
	s := set new.
	s ___add___: 1.
	s ___add___: 2.

	repr := s perform: #__repr__ env: 2.

	self assert: (repr perform: #includesString: env: 0 withArguments: {'{'}).
	self assert: (repr perform: #includesString: env: 0 withArguments: {'}'})
%

category: 'Tests - String Representation'
method: SetTestCase
testEmptySetRepr
	"Test string representation of empty set"

	| s repr |
	s := set new.

	repr := s perform: #__repr__ env: 2.

	self assert: repr equals: 'set()'
%


