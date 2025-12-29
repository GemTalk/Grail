! ===============================================================================
! BytearrayTestCase - Tests for Python bytearray type
! ===============================================================================

set compile_env: 0

category: 'Tests - Initialization'
method: BytearrayTestCase
test__new__empty
	"Test bytearray() constructor"

	| result |
	result := bytearray ___new___: bytearray.
	self assert: (result ___len___) equals: 0.
%

category: 'Tests - Initialization'
method: BytearrayTestCase
test__new__fromInteger
	"Test bytearray(n) - create n zero bytes"

	| result |
	result := bytearray ___new___: bytearray _: 5.
	self assert: (result ___len___) equals: 5.
	self assert: (result at: 1) equals: 0.
	self assert: (result at: 5) equals: 0.
%

category: 'Tests - Initialization'
method: BytearrayTestCase
test__new__fromList
	"Test bytearray([65, 66, 67]) creates bytearray(b'ABC')"

	| list result |
	list := OrderedCollection new.
	list add: 65.
	list add: 66.
	list add: 67.

	result := bytearray ___new___: bytearray _: list.
	self assert: (result ___len___) equals: 3.
	self assert: (result at: 1) equals: 65.
	self assert: (result at: 2) equals: 66.
	self assert: (result at: 3) equals: 67.
%

category: 'Tests - Initialization'
method: BytearrayTestCase
test__new__fromBytes
	"Test bytearray(b'hello') creates mutable copy"

	| bytes result |
	bytes := bytearray perform: #__new__:_:_: env: 2 withArguments: {bytearray. 'hello'. 'ascii'}.
	result := bytearray ___new___: bytearray _: bytes.

	self assert: (result ___len___) equals: 5.
	self assert: (result at: 1) equals: 104.  "h"
%

category: 'Tests - Initialization'
method: BytearrayTestCase
testFromhex
	"Test bytearray.fromhex('48656c6c6f')"

	| result |
	result := bytearray perform: #fromhex:_: env: 2 withArguments: {bytearray. '48656c6c6f'}.

	self assert: (result ___len___) equals: 5.
	self assert: (result at: 1) equals: 72.   "H"
	self assert: (result at: 2) equals: 101.  "e"
	self assert: (result at: 3) equals: 108.  "l"
	self assert: (result at: 4) equals: 108.  "l"
	self assert: (result at: 5) equals: 111.  "o"
%

category: 'Tests - Type'
method: BytearrayTestCase
test__class__
	"Test that type(bytearray()) returns bytearray"

	| result cls |
	result := bytearray ___new___: bytearray.
	cls := result perform: #__class__ env: 2.
	
	self assert: cls equals: (Python at: #'bytearray').
%

category: 'Tests - Mutability'
method: BytearrayTestCase
test__setitem__
	"Test that bytearray is mutable via __setitem__"

	| ba |
	ba := bytearray ___new___: bytearray _: 3.
	
	"Set values"
	ba perform: #__setitem__:_: env: 2 withArguments: {0. 65}.
	ba perform: #__setitem__:_: env: 2 withArguments: {1. 66}.
	ba perform: #__setitem__:_: env: 2 withArguments: {2. 67}.

	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 67.
%

category: 'Tests - Mutability'
method: BytearrayTestCase
test__setitem__negativeIndex
	"Test bytearray[-1] = 90"

	| ba |
	ba := bytearray ___new___: bytearray _: 3.
	ba perform: #__setitem__:_: env: 2 withArguments: {-1. 90}.

	self assert: (ba at: 3) equals: 90.
%

category: 'Tests - Mutability'
method: BytearrayTestCase
test__setitem__outOfRange
	"Test that setting out of range raises IndexError"

	| ba |
	ba := bytearray ___new___: bytearray _: 3.
	
	self 
		should: [ba perform: #__setitem__:_: env: 2 withArguments: {10. 65}]
		raise: IndexError.
%

category: 'Tests - Mutability'
method: BytearrayTestCase
test__setitem__invalidValue
	"Test that setting invalid byte value raises ValueError"

	| ba |
	ba := bytearray ___new___: bytearray _: 3.
	
	self 
		should: [ba perform: #__setitem__:_: env: 2 withArguments: {0. 256}]
		raise: ValueError.
	
	self
		should: [ba perform: #__setitem__:_: env: 2 withArguments: {0. -1}]
		raise: ValueError.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testAppend
	"Test bytearray.append(byte)"

	| ba |
	ba := bytearray ___new___: bytearray.

	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.
	ba perform: #append: env: 2 withArguments: {67}.

	self assert: (ba ___len___) equals: 3.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 67.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testAppendInvalidValue
	"Test that append with invalid value raises ValueError"

	| ba |
	ba := bytearray ___new___: bytearray.

	self
		should: [ba perform: #append: env: 2 withArguments: {256}]
		raise: ValueError.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testExtendWithBytes
	"Test bytearray.extend(b'hello')"

	| ba bytes |
	ba := bytearray ___new___: bytearray.
	bytes := bytearray perform: #__new__:_:_: env: 2 withArguments: {bytearray. 'hello'. 'ascii'}.

	ba perform: #extend: env: 2 withArguments: {bytes}.

	self assert: (ba ___len___) equals: 5.
	self assert: (ba at: 1) equals: 104.  "h"
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testExtendWithList
	"Test bytearray.extend([65, 66, 67])"

	| ba list |
	ba := bytearray ___new___: bytearray.
	list := OrderedCollection new.
	list add: 65.
	list add: 66.
	list add: 67.

	ba perform: #extend: env: 2 withArguments: {list}.

	self assert: (ba ___len___) equals: 3.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 67.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testInsert
	"Test bytearray.insert(index, byte)"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {67}.

	"Insert B between A and C"
	ba perform: #insert:_: env: 2 withArguments: {1. 66}.

	self assert: (ba ___len___) equals: 3.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 67.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testRemove
	"Test bytearray.remove(value)"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.
	ba perform: #append: env: 2 withArguments: {67}.

	ba perform: #remove: env: 2 withArguments: {66}.

	self assert: (ba ___len___) equals: 2.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 67.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testRemoveNotFound
	"Test that remove raises ValueError if value not found"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.

	self
		should: [ba perform: #remove: env: 2 withArguments: {66}]
		raise: ValueError.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testPop
	"Test bytearray.pop() - remove and return last byte"

	| ba result |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.
	ba perform: #append: env: 2 withArguments: {67}.

	result := ba perform: #pop env: 2.

	self assert: result equals: 67.
	self assert: (ba ___len___) equals: 2.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testPopEmpty
	"Test that pop on empty bytearray raises IndexError"

	| ba |
	ba := bytearray ___new___: bytearray.

	self
		should: [ba perform: #pop env: 2]
		raise: IndexError.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testPopIndex
	"Test bytearray.pop(index)"

	| ba result |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.
	ba perform: #append: env: 2 withArguments: {67}.

	result := ba perform: #pop: env: 2 withArguments: {1}.

	self assert: result equals: 66.
	self assert: (ba ___len___) equals: 2.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 67.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testClear
	"Test bytearray.clear()"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.
	ba perform: #append: env: 2 withArguments: {67}.

	ba perform: #clear env: 2.

	self assert: (ba ___len___) equals: 0.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testReverse
	"Test bytearray.reverse()"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.
	ba perform: #append: env: 2 withArguments: {67}.

	ba perform: #reverse env: 2.

	self assert: (ba ___len___) equals: 3.
	self assert: (ba at: 1) equals: 67.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 65.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testCopy
	"Test bytearray.copy()"

	| ba copy |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.

	copy := ba perform: #copy env: 2.

	self assert: (copy ___len___) equals: 2.
	self assert: (copy at: 1) equals: 65.
	self assert: (copy at: 2) equals: 66.

	"Verify it's a separate copy"
	copy perform: #__setitem__:_: env: 2 withArguments: {0. 90}.
	self assert: (ba at: 1) equals: 65.
	self assert: (copy at: 1) equals: 90.
%

category: 'Tests - Deletion'
method: BytearrayTestCase
test__delitem__
	"Test del bytearray[index]"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.
	ba perform: #append: env: 2 withArguments: {67}.

	ba perform: #__delitem__: env: 2 withArguments: {1}.

	self assert: (ba ___len___) equals: 2.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 67.
%

category: 'Tests - Deletion'
method: BytearrayTestCase
test__delitem__negativeIndex
	"Test del bytearray[-1]"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.
	ba perform: #append: env: 2 withArguments: {67}.

	ba perform: #__delitem__: env: 2 withArguments: {-1}.

	self assert: (ba ___len___) equals: 2.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
%

category: 'Tests - In-place Operations'
method: BytearrayTestCase
test__iadd__
	"Test bytearray += other"

	| ba bytes result |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.

	bytes := bytearray perform: #__new__:_:_: env: 2 withArguments: {bytearray. 'CD'. 'ascii'}.
	result := ba perform: #__iadd__: env: 2 withArguments: {bytes}.

	"Should return same object"
	self assert: result equals: ba.

	self assert: (ba ___len___) equals: 4.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 67.
	self assert: (ba at: 4) equals: 68.
%

category: 'Tests - In-place Operations'
method: BytearrayTestCase
test__imul__
	"Test bytearray *= count"

	| ba result |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.

	result := ba perform: #__imul__: env: 2 withArguments: {3}.

	"Should return same object"
	self assert: result equals: ba.

	self assert: (ba ___len___) equals: 6.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 65.
	self assert: (ba at: 4) equals: 66.
	self assert: (ba at: 5) equals: 65.
	self assert: (ba at: 6) equals: 66.
%

category: 'Tests - In-place Operations'
method: BytearrayTestCase
test__imul__zero
	"Test bytearray *= 0 clears the bytearray"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.

	ba perform: #__imul__: env: 2 withArguments: {0}.

	self assert: (ba ___len___) equals: 0.
%

category: 'Tests - Inherited Methods'
method: BytearrayTestCase
testInheritedUpper
	"Test that bytearray inherits upper() from bytes"

	| ba result |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {97}.   "a"
	ba perform: #append: env: 2 withArguments: {98}.   "b"
	ba perform: #append: env: 2 withArguments: {99}.   "c"

	result := ba perform: #upper env: 2.

	self assert: (result class) equals: bytearray.
	self assert: (result ___len___) equals: 3.
	self assert: (result at: 1) equals: 65.  "A"
	self assert: (result at: 2) equals: 66.  "B"
	self assert: (result at: 3) equals: 67.  "C"
%

category: 'Tests - Inherited Methods'
method: BytearrayTestCase
testInheritedFind
	"Test that bytearray inherits find() from bytes"

	| ba bytes result |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {72}.   "H"
	ba perform: #append: env: 2 withArguments: {101}.  "e"
	ba perform: #append: env: 2 withArguments: {108}.  "l"
	ba perform: #append: env: 2 withArguments: {108}.  "l"
	ba perform: #append: env: 2 withArguments: {111}.  "o"

	bytes := bytearray perform: #__new__:_:_: env: 2 withArguments: {bytearray. 'll'. 'ascii'}.
	result := ba perform: #find: env: 2 withArguments: {bytes}.

	self assert: result equals: 2.
%

category: 'Tests - Inherited Methods'
method: BytearrayTestCase
testInheritedDecode
	"Test that bytearray inherits decode() from bytes"

	| ba result |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {72}.   "H"
	ba perform: #append: env: 2 withArguments: {101}.  "e"
	ba perform: #append: env: 2 withArguments: {108}.  "l"
	ba perform: #append: env: 2 withArguments: {108}.  "l"
	ba perform: #append: env: 2 withArguments: {111}.  "o"

	result := ba perform: #decode env: 2.

	self assert: (result class) equals: Unicode7.
	self assert: result equals: 'Hello'.
%

category: 'Tests - Inherited Methods'
method: BytearrayTestCase
testInheritedIsascii
	"Test that bytearray inherits isascii() from bytes"

	| ba1 ba2 |
	"Create bytearray with ASCII bytes"
	ba1 := bytearray ___new___: bytearray.
	ba1 perform: #append: env: 2 withArguments: {65}.   "A"
	ba1 perform: #append: env: 2 withArguments: {66}.   "B"
	ba1 perform: #append: env: 2 withArguments: {67}.   "C"

	"Create bytearray with non-ASCII byte"
	ba2 := bytearray ___new___: bytearray.
	ba2 perform: #append: env: 2 withArguments: {65}.   "A"
	ba2 perform: #append: env: 2 withArguments: {200}.  "non-ASCII"
	ba2 perform: #append: env: 2 withArguments: {67}.   "C"

	self assert: (ba1 perform: #isascii env: 2).
	self deny: (ba2 perform: #isascii env: 2).
%

category: 'Tests - Comparison'
method: BytearrayTestCase
testEqualityWithBytes
	"Test bytearray == bytes comparison"

	| ba bytes |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.

	bytes := bytearray perform: #__new__:_:_: env: 2 withArguments: {bytearray. 'AB'. 'ascii'}.

	self assert: (ba perform: #__eq__: env: 2 withArguments: {bytes}).
%

category: 'Tests - Comparison'
method: BytearrayTestCase
testEqualityWithBytearray
	"Test bytearray == bytearray comparison"

	| ba1 ba2 |
	ba1 := bytearray ___new___: bytearray.
	ba1 perform: #append: env: 2 withArguments: {65}.
	ba1 perform: #append: env: 2 withArguments: {66}.

	ba2 := bytearray ___new___: bytearray.
	ba2 perform: #append: env: 2 withArguments: {65}.
	ba2 perform: #append: env: 2 withArguments: {66}.

	self assert: (ba1 perform: #__eq__: env: 2 withArguments: {ba2}).
%

category: 'Tests - Concatenation'
method: BytearrayTestCase
testConcatenation
	"Test bytearray + bytes returns new bytearray"

	| ba bytes result |
	ba := bytearray ___new___: bytearray.
	ba perform: #append: env: 2 withArguments: {65}.
	ba perform: #append: env: 2 withArguments: {66}.

	bytes := bytearray perform: #__new__:_:_: env: 2 withArguments: {bytearray. 'CD'. 'ascii'}.
	result := ba perform: #__add__: env: 2 withArguments: {bytes}.

	self assert: (result class) equals: bytearray.
	self assert: (result ___len___) equals: 4.

	"Original should be unchanged"
	self assert: (ba ___len___) equals: 2.
%

set compile_env: 0



