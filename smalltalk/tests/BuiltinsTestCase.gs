! ===============================================================================
! BuiltinsTestCase - Tests for Python builtins module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
BuiltinsTestCase removeAllMethods: 0.
BuiltinsTestCase class removeAllMethods: 0.
%

! ------------------- Test methods for BuiltinsTestCase

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testAbs
	"Test abs() function"

	| b result |
	b := builtins new.
	
	result := b perform: #abs: env: 2 withArguments: {5}.
	self assert: result equals: 5.
	
	result := b perform: #abs: env: 2 withArguments: {-5}.
	self assert: result equals: 5.
	
	result := b perform: #abs: env: 2 withArguments: {0}.
	self assert: result equals: 0.
	
	result := b perform: #abs: env: 2 withArguments: {-3.14}.
	self assert: (((result perform: #- env: 0 withArguments: {3.14}) perform: #abs env: 0)
		perform: #< env: 0 withArguments: {0.0001})
%

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testHex
	"Test hex() function"

	| b result |
	b := builtins new.
	
	result := b perform: #hex: env: 2 withArguments: {255}.
	self assert: result equals: '0xff'.
	
	result := b perform: #hex: env: 2 withArguments: {16}.
	self assert: result equals: '0x10'.
	
	result := b perform: #hex: env: 2 withArguments: {0}.
	self assert: result equals: '0x0'
%

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testOct
	"Test oct() function"

	| b result |
	b := builtins new.
	
	result := b perform: #oct: env: 2 withArguments: {8}.
	self assert: result equals: '0o10'.
	
	result := b perform: #oct: env: 2 withArguments: {64}.
	self assert: result equals: '0o100'.
	
	result := b perform: #oct: env: 2 withArguments: {0}.
	self assert: result equals: '0o0'
%

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testBin
	"Test bin() function"

	| b result |
	b := builtins new.
	
	result := b perform: #bin: env: 2 withArguments: {5}.
	self assert: result equals: '0b101'.
	
	result := b perform: #bin: env: 2 withArguments: {8}.
	self assert: result equals: '0b1000'.
	
	result := b perform: #bin: env: 2 withArguments: {0}.
	self assert: result equals: '0b0'
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testType
	"Test type() function"

	| b result |
	b := builtins new.

	result := b perform: #type: env: 2 withArguments: {42}.
	self assert: (42 perform: #isKindOf: env: 0 withArguments: {result}).

	result := b perform: #type: env: 2 withArguments: {'hello'}.
	self assert: ('hello' perform: #isKindOf: env: 0 withArguments: {result}).

	result := b perform: #type: env: 2 withArguments: {list new}.
	self assert: ((list new) perform: #isKindOf: env: 0 withArguments: {result})
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testLen
	"Test len() function"

	| b result lst |
	b := builtins new.
	
	result := b perform: #len: env: 2 withArguments: {'hello'}.
	self assert: result equals: 5.
	
	lst := list new.
	lst perform: #append: env: 2 withArguments: {1}.
	lst perform: #append: env: 2 withArguments: {2}.
	lst perform: #append: env: 2 withArguments: {3}.
	result := b perform: #len: env: 2 withArguments: {lst}.
	self assert: result equals: 3
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testLenTypeError
	"Test that len() raises TypeError for objects without __len__"

	| b |
	b := builtins new.
	
	self should: [
		b perform: #len: env: 2 withArguments: {42}
	] raise: TypeError
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testHash
	"Test hash() function"

	| b result |
	b := builtins new.

	result := b perform: #hash: env: 2 withArguments: {42}.
	self assert: (result perform: #isKindOf: env: 0 withArguments: {Integer}).

	result := b perform: #hash: env: 2 withArguments: {'hello'}.
	self assert: (result perform: #isKindOf: env: 0 withArguments: {Integer})
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testRepr
	"Test repr() function"

	| b result |
	b := builtins new.

	result := b perform: #repr: env: 2 withArguments: {'hello'}.
	self assert: (result perform: #includesString: env: 0 withArguments: {'hello'}).

	result := b perform: #repr: env: 2 withArguments: {42}.
	self assert: result equals: '42'
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testStr
	"Test str() function"

	| b result |
	b := builtins new.

	result := b perform: #str: env: 2 withArguments: {42}.
	self assert: result equals: '42'.

	result := b perform: #str: env: 2 withArguments: {'hello'}.
	self assert: result equals: 'hello'
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testChr
	"Test chr() function"

	| b result |
	b := builtins new.

	result := b perform: #chr: env: 2 withArguments: {65}.
	self assert: result equals: 'A'.

	result := b perform: #chr: env: 2 withArguments: {97}.
	self assert: result equals: 'a'.

	result := b perform: #chr: env: 2 withArguments: {48}.
	self assert: result equals: '0'
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testOrd
	"Test ord() function"

	| b result |
	b := builtins new.

	result := b perform: #ord: env: 2 withArguments: {'A'}.
	self assert: result equals: 65.

	result := b perform: #ord: env: 2 withArguments: {'a'}.
	self assert: result equals: 97.

	result := b perform: #ord: env: 2 withArguments: {'0'}.
	self assert: result equals: 48
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testOrdTypeError
	"Test that ord() raises TypeError for strings with length != 1"

	| b |
	b := builtins new.

	self should: [
		b perform: #ord: env: 2 withArguments: {'hello'}
	] raise: TypeError.

	self should: [
		b perform: #ord: env: 2 withArguments: {''}
	] raise: TypeError
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testMin
	"Test min() function"

	| b result lst |
	b := builtins new.

	lst := list perform: #withAll: env: 0 withArguments: {#(5 2 8 1 9)}.
	result := b perform: #min: env: 2 withArguments: {lst}.
	self assert: result equals: 1.

	lst := list perform: #withAll: env: 0 withArguments: {#(-5 -2 -8)}.
	result := b perform: #min: env: 2 withArguments: {lst}.
	self assert: result equals: -8
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testMax
	"Test max() function"

	| b result lst |
	b := builtins new.

	lst := list perform: #withAll: env: 0 withArguments: {#(5 2 8 1 9)}.
	result := b perform: #max: env: 2 withArguments: {lst}.
	self assert: result equals: 9.

	lst := list perform: #withAll: env: 0 withArguments: {#(-5 -2 -8)}.
	result := b perform: #max: env: 2 withArguments: {lst}.
	self assert: result equals: -2
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testSum
	"Test sum() function"

	| b result lst |
	b := builtins new.

	lst := list perform: #withAll: env: 0 withArguments: {#(1 2 3 4 5)}.
	result := b perform: #sum: env: 2 withArguments: {lst}.
	self assert: result equals: 15.

	lst := list perform: #withAll: env: 0 withArguments: {#()}.
	result := b perform: #sum: env: 2 withArguments: {lst}.
	self assert: result equals: 0
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testAll
	"Test all() function"

	| b result lst |
	b := builtins new.

	lst := list perform: #withAll: env: 0 withArguments: {#(true true true)}.
	result := b perform: #all: env: 2 withArguments: {lst}.
	self assert: result.

	lst := list perform: #withAll: env: 0 withArguments: {#(true false true)}.
	result := b perform: #all: env: 2 withArguments: {lst}.
	self deny: result.

	lst := list perform: #withAll: env: 0 withArguments: {#()}.
	result := b perform: #all: env: 2 withArguments: {lst}.
	self assert: result
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testAny
	"Test any() function"

	| b result lst |
	b := builtins new.

	lst := list perform: #withAll: env: 0 withArguments: {#(false false true)}.
	result := b perform: #any: env: 2 withArguments: {lst}.
	self assert: result.

	lst := list perform: #withAll: env: 0 withArguments: {#(false false false)}.
	result := b perform: #any: env: 2 withArguments: {lst}.
	self deny: result.

	lst := list perform: #withAll: env: 0 withArguments: {#()}.
	result := b perform: #any: env: 2 withArguments: {lst}.
	self deny: result
%

category: 'Tests - Type Checking'
method: BuiltinsTestCase
testIsinstance
	"Test isinstance() function"

	| b result lst |
	b := builtins new.

	result := b perform: #isinstance:_: env: 2 withArguments: {42. int}.
	self assert: result.

	result := b perform: #isinstance:_: env: 2 withArguments: {'hello'. str}.
	self assert: result.

	lst := list new.
	result := b perform: #isinstance:_: env: 2 withArguments: {lst. list}.
	self assert: result.

	result := b perform: #isinstance:_: env: 2 withArguments: {42. str}.
	self deny: result
%

category: 'Tests - Introspection'
method: BuiltinsTestCase
testCallable
	"Test callable() function"

	| b method result lst |
	b := builtins new.
	method := builtins compiledMethodAt: #abs: environmentId: 2.
	"Functions/methods are callable"
	result := b perform: #callable: env: 2 withArguments: {method}.
	self assert: result.

	"Regular objects are not callable"
	result := b perform: #callable: env: 2 withArguments: {42}.
	self deny: result.

	lst := list new.
	result := b perform: #callable: env: 2 withArguments: {lst}.
	self deny: result
%

category: 'Tests - Introspection'
method: BuiltinsTestCase
testId
	"Test id() function"

	| b result obj1 obj2 id1 id2 |
	b := builtins new.

	obj1 := list new.
	obj2 := list new.

	id1 := b perform: #id: env: 2 withArguments: {obj1}.
	id2 := b perform: #id: env: 2 withArguments: {obj2}.

	self assert: (id1 perform: #isKindOf: env: 0 withArguments: {Integer}).
	self assert: (id2 perform: #isKindOf: env: 0 withArguments: {Integer}).
	self deny: id1 == id2
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testPow
	"Test pow() function"

	| b result |
	b := builtins new.

	result := b perform: #pow:_: env: 2 withArguments: {2. 3}.
	self assert: result equals: 8.

	result := b perform: #pow:_: env: 2 withArguments: {5. 2}.
	self assert: result equals: 25.

	result := b perform: #pow:_: env: 2 withArguments: {10. 0}.
	self assert: result equals: 1
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testPowWithModulo
	"Test pow() function with modulo"

	| b result |
	b := builtins new.

	result := b perform: #pow:_:_: env: 2 withArguments: {2. 3. 5}.
	self assert: result equals: 3.

	result := b perform: #pow:_:_: env: 2 withArguments: {10. 2. 7}.
	self assert: result equals: 2
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testRound
	"Test round() function"

	| b result |
	b := builtins new.

	result := b perform: #round: env: 2 withArguments: {3.7}.
	self assert: result equals: 4.

	result := b perform: #round: env: 2 withArguments: {3.2}.
	self assert: result equals: 3.

	result := b perform: #round: env: 2 withArguments: {-2.8}.
	self assert: result equals: -3
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testDivmod
	"Test divmod() function"

	| b result quotient remainder |
	b := builtins new.

	result := b perform: #divmod:_: env: 2 withArguments: {10. 3}.
	quotient := result perform: #__getitem__: env: 2 withArguments: {0}.
	remainder := result perform: #__getitem__: env: 2 withArguments: {1}.
	self assert: quotient equals: 3.
	self assert: remainder equals: 1.

	result := b perform: #divmod:_: env: 2 withArguments: {17. 5}.
	quotient := result perform: #__getitem__: env: 2 withArguments: {0}.
	remainder := result perform: #__getitem__: env: 2 withArguments: {1}.
	self assert: quotient equals: 3.
	self assert: remainder equals: 2
%

category: 'Tests - Sequence Functions'
method: BuiltinsTestCase
testSorted
	"Test sorted() function - returns a new sorted list, leaving original unchanged"

	| b result lst |
	b := builtins new.

	lst := list perform: #withAll: env: 0 withArguments: {#(3 1 4 1 5 9 2 6)}.
	result := b perform: #sorted: env: 2 withArguments: {lst}.

	"Verify the result is sorted"
	self assert: (result perform: #__getitem__: env: 2 withArguments: {0}) equals: 1.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {1}) equals: 1.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {2}) equals: 2.
	self assert: (result ___len___) equals: 8.

	"Verify the original list is unchanged"
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {0}) equals: 3.
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {1}) equals: 1.
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {2}) equals: 4.
	self assert: (lst ___len___) equals: 8
%

category: 'Tests - Sequence Functions'
method: BuiltinsTestCase
testEnumerate
	"Test enumerate() function"

	| b result lst iter first second |
	b := builtins new.

	lst := list perform: #withAll: env: 0 withArguments: {#('a' 'b' 'c')}.
	result := b perform: #enumerate: env: 2 withArguments: {lst}.

	first := result perform: #__next__ env: 2.
	self assert: (first perform: #__getitem__: env: 2 withArguments: {0}) equals: 0.
	self assert: (first perform: #__getitem__: env: 2 withArguments: {1}) equals: 'a'.

	second := result perform: #__next__ env: 2.
	self assert: (second perform: #__getitem__: env: 2 withArguments: {0}) equals: 1.
	self assert: (second perform: #__getitem__: env: 2 withArguments: {1}) equals: 'b'
%

category: 'Tests - Sequence Functions'
method: BuiltinsTestCase
testZip
	"Test zip() function"

	| b result lst1 lst2 iterables iter first |
	b := builtins new.

	lst1 := list perform: #withAll: env: 0 withArguments: {#(1 2 3)}.
	lst2 := list perform: #withAll: env: 0 withArguments: {#('a' 'b' 'c')}.
	iterables := list perform: #withAll: env: 0 withArguments: {{lst1. lst2}}.

	result := b perform: #zip: env: 2 withArguments: {iterables}.

	first := result perform: #__next__ env: 2.
	self assert: (first perform: #__getitem__: env: 2 withArguments: {0}) equals: 1.
	self assert: (first perform: #__getitem__: env: 2 withArguments: {1}) equals: 'a'
%




