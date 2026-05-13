! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BytearrayTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BytearrayTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BytearrayTestCase category: 'SUnit'
%

! ===============================================================================
! BytearrayTestCase - Tests for Python bytearray type
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BytearrayTestCase removeAllMethods.
BytearrayTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests - Type'
method: BytearrayTestCase
test__class__
	"Test that type(bytearray()) returns bytearray"

	| result cls |
	result := bytearray ___new___: bytearray.
	cls := result @env1:__class__.
	
	self assert: cls equals: (Python at: #'bytearray').
%

category: 'Tests - Deletion'
method: BytearrayTestCase
test__delitem__
	"Test del bytearray[index]"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.
	ba @env1:append: 67.

	ba @env1:__delitem__: 1.

	self assert: ba size equals: 2.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 67.
%

category: 'Tests - Deletion'
method: BytearrayTestCase
test__delitem__negativeIndex
	"Test del bytearray[-1]"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.
	ba @env1:append: 67.

	ba @env1:__delitem__: -1.

	self assert: ba size equals: 2.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
%

category: 'Tests - In-place Operations'
method: BytearrayTestCase
test__iadd__
	"Test bytearray += other"

	| ba bytes result |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.

	bytes := bytearray @env1:__new__: 'CD' _: 'ascii'.
	result := ba @env1:__iadd__: bytes.

	"Should return same object"
	self assert: result equals: ba.

	self assert: ba size equals: 4.
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
	ba @env1:append: 65.
	ba @env1:append: 66.

	result := ba @env1:__imul__: 3.

	"Should return same object"
	self assert: result equals: ba.

	self assert: ba size equals: 6.
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
	ba @env1:append: 65.
	ba @env1:append: 66.

	ba @env1:__imul__: 0.

	self assert: ba size equals: 0.
%

category: 'Tests - Initialization'
method: BytearrayTestCase
test__new__empty
	"Test bytearray() constructor"

	| result |
	result := bytearray ___new___: bytearray.
	self assert: result size equals: 0.
%

category: 'Tests - Initialization'
method: BytearrayTestCase
test__new__fromBytes
	"Test bytearray(b'hello') creates mutable copy"

	| bytes result |
	bytes := bytearray @env1:__new__: 'hello' _: 'ascii'.
	result := bytearray ___new___: bytes.

	self assert: result size equals: 5.
	self assert: (result at: 1) equals: 104.  "h"
%

category: 'Tests - Initialization'
method: BytearrayTestCase
test__new__fromInteger
	"Test bytearray(n) - create n zero bytes"

	| result |
	result := bytearray ___new___: 5.
	self assert: result size equals: 5.
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

	result := bytearray ___new___: list.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 65.
	self assert: (result at: 2) equals: 66.
	self assert: (result at: 3) equals: 67.
%

category: 'Tests - Mutability'
method: BytearrayTestCase
test__setitem__
	"Test that bytearray is mutable via __setitem__"

	| ba |
	ba := bytearray ___new___: 3.
	
	"Set values"
	ba @env1:__setitem__: 0 _: 65.
	ba @env1:__setitem__: 1 _: 66.
	ba @env1:__setitem__: 2 _: 67.

	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 67.
%

category: 'Tests - Mutability'
method: BytearrayTestCase
test__setitem__invalidValue
	"Test that setting invalid byte value raises ValueError"

	| ba |
	ba := bytearray ___new___: 3.
	
	self 
		should: [ba @env1:__setitem__: 0 _: 256]
		raise: ValueError.
	
	self
		should: [ba @env1:__setitem__: 0 _: -1]
		raise: ValueError.
%

category: 'Tests - Mutability'
method: BytearrayTestCase
test__setitem__negativeIndex
	"Test bytearray[-1] = 90"

	| ba |
	ba := bytearray ___new___: 3.
	ba @env1:__setitem__: -1 _: 90.

	self assert: (ba at: 3) equals: 90.
%

category: 'Tests - Mutability'
method: BytearrayTestCase
test__setitem__outOfRange
	"Test that setting out of range raises IndexError"

	| ba |
	ba := bytearray ___new___: 3.
	
	self 
		should: [ba @env1:__setitem__: 10 _: 65]
		raise: IndexError.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testAppend
	"Test bytearray.append(byte)"

	| ba |
	ba := bytearray ___new___: bytearray.

	ba @env1:append: 65.
	ba @env1:append: 66.
	ba @env1:append: 67.

	self assert: ba size equals: 3.
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
		should: [ba @env1:append: 256]
		raise: ValueError.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testClear
	"Test bytearray.clear()"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.
	ba @env1:append: 67.

	ba @env1:clear.

	self assert: ba size equals: 0.
%

category: 'Tests - Concatenation'
method: BytearrayTestCase
testConcatenation
	"Test bytearray + bytes returns new bytearray"

	| ba bytes result |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.

	bytes := bytearray @env1:__new__: 'CD' _: 'ascii'.
	result := ba @env1:__add__: bytes.

	self assert: (result class) equals: bytearray.
	self assert: result size equals: 4.

	"Original should be unchanged"
	self assert: ba size equals: 2.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testCopy
	"Test bytearray.copy()"

	| ba copy |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.

	copy := ba @env1:copy.

	self assert: copy size equals: 2.
	self assert: (copy at: 1) equals: 65.
	self assert: (copy at: 2) equals: 66.

	"Verify it's a separate copy"
	copy @env1:__setitem__: 0 _: 90.
	self assert: (ba at: 1) equals: 65.
	self assert: (copy at: 1) equals: 90.
%

category: 'Tests - Comparison'
method: BytearrayTestCase
testEqualityWithBytearray
	"Test bytearray == bytearray comparison"

	| ba1 ba2 |
	ba1 := bytearray ___new___: bytearray.
	ba1 @env1:append: 65.
	ba1 @env1:append: 66.

	ba2 := bytearray ___new___: bytearray.
	ba2 @env1:append: 65.
	ba2 @env1:append: 66.

	self assert: (ba1 @env1:__eq__: ba2).
%

category: 'Tests - Comparison'
method: BytearrayTestCase
testEqualityWithBytes
	"Test bytearray == bytes comparison"

	| ba bytes |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.

	bytes := bytearray @env1:__new__: 'AB' _: 'ascii'.

	self assert: (ba @env1:__eq__: bytes).
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testExtendWithBytes
	"Test bytearray.extend(b'hello')"

	| ba bytes |
	ba := bytearray ___new___: bytearray.
	bytes := bytearray @env1:__new__: 'hello' _: 'ascii'.

	ba @env1:extend: bytes.

	self assert: ba size equals: 5.
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

	ba @env1:extend: list.

	self assert: ba size equals: 3.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 67.
%

category: 'Tests - Initialization'
method: BytearrayTestCase
testFromhex
	"Test bytearray.fromhex('48656c6c6f')"

	| result |
	result := bytearray @env1:fromhex: '48656c6c6f'.

	self assert: result size equals: 5.
	self assert: (result at: 1) equals: 72.   "H"
	self assert: (result at: 2) equals: 101.  "e"
	self assert: (result at: 3) equals: 108.  "l"
	self assert: (result at: 4) equals: 108.  "l"
	self assert: (result at: 5) equals: 111.  "o"
%

category: 'Tests - Inherited Methods'
method: BytearrayTestCase
testInheritedDecode
	"Test that bytearray inherits decode() from bytes"

	| ba result |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 72.   "H"
	ba @env1:append: 101.  "e"
	ba @env1:append: 108.  "l"
	ba @env1:append: 108.  "l"
	ba @env1:append: 111.  "o"

	result := ba @env1:decode.

	self assert: (result class) equals: Unicode7.
	self assert: result equals: 'Hello'.
%

category: 'Tests - Inherited Methods'
method: BytearrayTestCase
testInheritedFind
	"Test that bytearray inherits find() from bytes"

	| ba bytes result |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 72.   "H"
	ba @env1:append: 101.  "e"
	ba @env1:append: 108.  "l"
	ba @env1:append: 108.  "l"
	ba @env1:append: 111.  "o"

	bytes := bytearray @env1:__new__: 'll' _: 'ascii'.
	result := ba @env1:find: bytes.

	self assert: result equals: 2.
%

category: 'Tests - Inherited Methods'
method: BytearrayTestCase
testInheritedIsascii
	"Test that bytearray inherits isascii() from bytes"

	| ba1 ba2 |
	"Create bytearray with ASCII bytes"
	ba1 := bytearray ___new___: bytearray.
	ba1 @env1:append: 65.   "A"
	ba1 @env1:append: 66.   "B"
	ba1 @env1:append: 67.   "C"

	"Create bytearray with non-ASCII byte"
	ba2 := bytearray ___new___: bytearray.
	ba2 @env1:append: 65.   "A"
	ba2 @env1:append: 200.  "non-ASCII"
	ba2 @env1:append: 67.   "C"

	self assert: (ba1 @env1:isascii).
	self deny: (ba2 @env1:isascii).
%

category: 'Tests - Inherited Methods'
method: BytearrayTestCase
testInheritedUpper
	"Test that bytearray inherits upper() from bytes"

	| ba result |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 97.   "a"
	ba @env1:append: 98.   "b"
	ba @env1:append: 99.   "c"

	result := ba @env1:upper.

	self assert: (result class) equals: bytearray.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 65.  "A"
	self assert: (result at: 2) equals: 66.  "B"
	self assert: (result at: 3) equals: 67.  "C"
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testInsert
	"Test bytearray.insert(index, byte)"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 67.

	"Insert B between A and C"
	ba @env1:insert: 1 _: 66.

	self assert: ba size equals: 3.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 67.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testPop
	"Test bytearray.pop() - remove and return last byte"

	| ba result |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.
	ba @env1:append: 67.

	result := ba @env1:pop.

	self assert: result equals: 67.
	self assert: ba size equals: 2.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testPopEmpty
	"Test that pop on empty bytearray raises IndexError"

	| ba |
	ba := bytearray ___new___: bytearray.

	self
		should: [ba @env1:pop]
		raise: IndexError.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testPopIndex
	"Test bytearray.pop(index)"

	| ba result |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.
	ba @env1:append: 67.

	result := ba @env1:pop: 1.

	self assert: result equals: 66.
	self assert: ba size equals: 2.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 67.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testRemove
	"Test bytearray.remove(value)"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.
	ba @env1:append: 67.

	ba @env1:remove: 66.

	self assert: ba size equals: 2.
	self assert: (ba at: 1) equals: 65.
	self assert: (ba at: 2) equals: 67.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testRemoveNotFound
	"Test that remove raises ValueError if value not found"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.

	self
		should: [ba @env1:remove: 66]
		raise: ValueError.
%

category: 'Tests - Mutation Methods'
method: BytearrayTestCase
testReverse
	"Test bytearray.reverse()"

	| ba |
	ba := bytearray ___new___: bytearray.
	ba @env1:append: 65.
	ba @env1:append: 66.
	ba @env1:append: 67.

	ba @env1:reverse.

	self assert: ba size equals: 3.
	self assert: (ba at: 1) equals: 67.
	self assert: (ba at: 2) equals: 66.
	self assert: (ba at: 3) equals: 65.
%
