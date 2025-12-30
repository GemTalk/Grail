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

	| b absBlock result |
	b := builtins ___instance___.
	absBlock := b perform: #abs env: 2.

	result := absBlock value: {5} value: nil.
	self assert: result equals: 5.

	result := absBlock value: {-5} value: nil.
	self assert: result equals: 5.

	result := absBlock value: {0} value: nil.
	self assert: result equals: 0.

	result := absBlock value: {-3.14} value: nil.
	self assert: (result - 3.14) abs < 0.0001
%

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testHex
	"Test hex() function"

	| b hexBlock result |
	b := builtins ___instance___.
	hexBlock := b perform: #hex env: 2.

	result := hexBlock value: {255} value: nil.
	self assert: result equals: '0xff'.

	result := hexBlock value: {16} value: nil.
	self assert: result equals: '0x10'.

	result := hexBlock value: {0} value: nil.
	self assert: result equals: '0x0'
%

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testOct
	"Test oct() function"

	| b octBlock result |
	b := builtins ___instance___.
	octBlock := b perform: #oct env: 2.

	result := octBlock value: {8} value: nil.
	self assert: result equals: '0o10'.

	result := octBlock value: {64} value: nil.
	self assert: result equals: '0o100'.

	result := octBlock value: {0} value: nil.
	self assert: result equals: '0o0'
%

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testBin
	"Test bin() function"

	| b binBlock result |
	b := builtins ___instance___.
	binBlock := b perform: #bin env: 2.

	result := binBlock value: {5} value: nil.
	self assert: result equals: '0b101'.

	result := binBlock value: {8} value: nil.
	self assert: result equals: '0b1000'.

	result := binBlock value: {0} value: nil.
	self assert: result equals: '0b0'
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testType
	"Test type() function"

	| b typeBlock result |
	b := builtins ___instance___.
	typeBlock := b perform: #type env: 2.

	result := typeBlock value: {42} value: nil.
	self assert: (42 isKindOf: result).

	result := typeBlock value: {'hello'} value: nil.
	self assert: ('hello' isKindOf: result).

	result := typeBlock value: {list new} value: nil.
	self assert: (list new isKindOf: result)
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testLen
	"Test len() function"

	| b lenBlock result lst |
	b := builtins ___instance___.
	lenBlock := b perform: #len env: 2.

	result := lenBlock value: {'hello'} value: nil.
	self assert: result equals: 5.

	lst := list new.
	lst perform: #append: env: 2 withArguments: {1}.
	lst perform: #append: env: 2 withArguments: {2}.
	lst perform: #append: env: 2 withArguments: {3}.
	result := lenBlock value: {lst} value: nil.
	self assert: result equals: 3
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testLenTypeError
	"Test that len() raises TypeError for objects without __len__"

	| b lenBlock |
	b := builtins ___instance___.
	lenBlock := b perform: #len env: 2.

	self should: [
		lenBlock value: {42} value: nil.
	] raise: TypeError
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testHash
	"Test hash() function"

	| b hashBlock result |
	b := builtins ___instance___.
	hashBlock := b perform: #hash env: 2.

	result := hashBlock value: {42} value: nil.
	self assert: (result isKindOf: Integer).

	result := hashBlock value: {'hello'} value: nil.
	self assert: (result isKindOf: Integer)
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testRepr
	"Test repr() function"

	| b reprBlock result |
	b := builtins ___instance___.
	reprBlock := b perform: #repr env: 2.

	result := reprBlock value: {'hello'} value: nil.
	self assert: (result includesString: 'hello').

	result := reprBlock value: {42} value: nil.
	self assert: result equals: '42'
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testStr
	"Test str() function"

	| b strBlock result |
	b := builtins ___instance___.
	strBlock := b perform: #str env: 2.

	result := strBlock value: {42} value: nil.
	self assert: result equals: '42'.

	result := strBlock value: {'hello'} value: nil.
	self assert: result equals: 'hello'
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testChr
	"Test chr() function"

	| b chrBlock result |
	b := builtins ___instance___.
	chrBlock := b perform: #chr env: 2.

	result := chrBlock value: {65} value: nil.
	self assert: result equals: 'A'.

	result := chrBlock value: {97} value: nil.
	self assert: result equals: 'a'.

	result := chrBlock value: {48} value: nil.
	self assert: result equals: '0'
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testOrd
	"Test ord() function"

	| b ordBlock result |
	b := builtins ___instance___.
	ordBlock := b perform: #ord env: 2.

	result := ordBlock value: {'A'} value: nil.
	self assert: result equals: 65.

	result := ordBlock value: {'a'} value: nil.
	self assert: result equals: 97.

	result := ordBlock value: {'0'} value: nil.
	self assert: result equals: 48
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testOrdTypeError
	"Test that ord() raises TypeError for strings with length != 1"

	| b ordBlock |
	b := builtins ___instance___.
	ordBlock := b perform: #ord env: 2.

	self should: [
		ordBlock value: {'hello'} value: nil.
	] raise: TypeError.

	self should: [
		ordBlock value: {''} value: nil.
	] raise: TypeError
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testMin
	"Test min() function"

	| b minBlock result lst |
	b := builtins ___instance___.
	minBlock := b perform: #min env: 2.

	lst := list withAll: #(5 2 8 1 9).
	result := minBlock value: {lst} value: nil.
	self assert: result equals: 1.

	lst := list withAll: #(-5 -2 -8).
	result := minBlock value: {lst} value: nil.
	self assert: result equals: -8
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testMax
	"Test max() function"

	| b maxBlock result lst |
	b := builtins ___instance___.
	maxBlock := b perform: #max env: 2.

	lst := list withAll: #(5 2 8 1 9).
	result := maxBlock value: {lst} value: nil.
	self assert: result equals: 9.

	lst := list withAll: #(-5 -2 -8).
	result := maxBlock value: {lst} value: nil.
	self assert: result equals: -2
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testSum
	"Test sum() function"

	| b sumBlock result lst |
	b := builtins ___instance___.
	sumBlock := b perform: #sum env: 2.

	lst := list withAll: #(1 2 3 4 5).
	result := sumBlock value: {lst} value: nil.
	self assert: result equals: 15.

	lst := list withAll: #().
	result := sumBlock value: {lst} value: nil.
	self assert: result equals: 0
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testAll
	"Test all() function"

	| b allBlock result lst |
	b := builtins ___instance___.
	allBlock := b perform: #all env: 2.

	lst := list withAll: #(true true true).
	result := allBlock value: {lst} value: nil.
	self assert: result.

	lst := list withAll: #(true false true).
	result := allBlock value: {lst} value: nil.
	self deny: result.

	lst := list withAll: #().
	result := allBlock value: {lst} value: nil.
	self assert: result
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testAny
	"Test any() function"

	| b anyBlock result lst |
	b := builtins ___instance___.
	anyBlock := b perform: #any env: 2.

	lst := list withAll: #(false false true).
	result := anyBlock value: {lst} value: nil.
	self assert: result.

	lst := list withAll: #(false false false).
	result := anyBlock value: {lst} value: nil.
	self deny: result.

	lst := list withAll: #().
	result := anyBlock value: {lst} value: nil.
	self deny: result
%

category: 'Tests - Type Checking'
method: BuiltinsTestCase
testIsinstance
	"Test isinstance() function"

	| b isinstanceBlock result lst |
	b := builtins ___instance___.
	isinstanceBlock := b perform: #isinstance env: 2.

	result := isinstanceBlock value: {42. int} value: nil.
	self assert: result.

	result := isinstanceBlock value: {'hello'. str} value: nil.
	self assert: result.

	lst := list new.
	result := isinstanceBlock value: {lst. list} value: nil.
	self assert: result.

	result := isinstanceBlock value: {42. str} value: nil.
	self deny: result
%

category: 'Tests - Introspection'
method: BuiltinsTestCase
testCallable
	"Test callable() function"

	| b callableBlock method result lst |
	b := builtins ___instance___.
	callableBlock := b perform: #callable env: 2.
	method := b perform: #abs env: 2.
	"Functions/methods are callable"
	result := callableBlock value: {method} value: nil.
	self assert: result.

	"Regular objects are not callable"
	result := callableBlock value: {42} value: nil.
	self deny: result.

	lst := list new.
	result := callableBlock value: {lst} value: nil.
	self deny: result
%

category: 'Tests - Introspection'
method: BuiltinsTestCase
testId
	"Test id() function"

	| b idBlock result obj1 obj2 id1 id2 |
	b := builtins ___instance___.
	idBlock := b perform: #id env: 2.

	obj1 := list new.
	obj2 := list new.

	id1 := idBlock value: {obj1} value: nil.
	id2 := idBlock value: {obj2} value: nil.

	self assert: (id1 isKindOf: Integer).
	self assert: (id2 isKindOf: Integer).
	self deny: id1 == id2
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testPow
	"Test pow() function"

	| b powBlock result |
	b := builtins ___instance___.
	powBlock := b perform: #pow env: 2.

	result := powBlock value: {2. 3} value: nil.
	self assert: result equals: 8.

	result := powBlock value: {5. 2} value: nil.
	self assert: result equals: 25.

	result := powBlock value: {10. 0} value: nil.
	self assert: result equals: 1
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testPowWithModulo
	"Test pow() function with modulo"

	| b powModBlock result |
	b := builtins ___instance___.
	powModBlock := b perform: #powWithMod env: 2.

	result := powModBlock value: {2. 3. 5} value: nil.
	self assert: result equals: 3.

	result := powModBlock value: {10. 2. 7} value: nil.
	self assert: result equals: 2
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testRound
	"Test round() function"

	| b roundBlock result |
	b := builtins ___instance___.
	roundBlock := b perform: #round env: 2.

	result := roundBlock value: {3.7} value: nil.
	self assert: result equals: 4.

	result := roundBlock value: {3.2} value: nil.
	self assert: result equals: 3.

	result := roundBlock value: {-2.8} value: nil.
	self assert: result equals: -3
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testDivmod
	"Test divmod() function"

	| b divmodBlock result quotient remainder |
	b := builtins ___instance___.
	divmodBlock := b perform: #divmod env: 2.

	result := divmodBlock value: {10. 3} value: nil.
	quotient := result perform: #__getitem__: env: 2 withArguments: {0}.
	remainder := result perform: #__getitem__: env: 2 withArguments: {1}.
	self assert: quotient equals: 3.
	self assert: remainder equals: 1.

	result := divmodBlock value: {17. 5} value: nil.
	quotient := result perform: #__getitem__: env: 2 withArguments: {0}.
	remainder := result perform: #__getitem__: env: 2 withArguments: {1}.
	self assert: quotient equals: 3.
	self assert: remainder equals: 2
%

category: 'Tests - Sequence Functions'
method: BuiltinsTestCase
testSorted
	"Test sorted() function - returns a new sorted list, leaving original unchanged"

	| b sortedBlock result lst |
	b := builtins ___instance___.
	sortedBlock := b perform: #sorted env: 2.

	lst := list withAll: #(3 1 4 1 5 9 2 6).
	result := sortedBlock value: {lst} value: nil.

	"Verify the result is sorted"
	self assert: (result perform: #__getitem__: env: 2 withArguments: {0}) equals: 1.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {1}) equals: 1.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {2}) equals: 2.
	self assert: result size equals: 8.

	"Verify the original list is unchanged"
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {0}) equals: 3.
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {1}) equals: 1.
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {2}) equals: 4.
	self assert: lst size equals: 8
%

category: 'Tests - Sequence Functions'
method: BuiltinsTestCase
testEnumerate
	"Test enumerate() function"

	| b enumerateBlock result lst iter first second |
	b := builtins ___instance___.
	enumerateBlock := b perform: #enumerate env: 2.

	lst := list withAll: #('a' 'b' 'c').
	result := enumerateBlock value: {lst} value: nil.

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

	| b zipBlock result lst1 lst2 iterables iter first |
	b := builtins ___instance___.
	zipBlock := b perform: #zip env: 2.

	lst1 := list withAll: #(1 2 3).
	lst2 := list withAll: #('a' 'b' 'c').
	iterables := list withAll: {lst1. lst2}.

	result := zipBlock value: {iterables} value: nil.

	first := result perform: #__next__ env: 2.
	self assert: (first perform: #__getitem__: env: 2 withArguments: {0}) equals: 1.
	self assert: (first perform: #__getitem__: env: 2 withArguments: {1}) equals: 'a'
%

category: 'Tests - Utility'
method: BuiltinsTestCase
testAsSymbolDictionary
	"Test asSymbolDictionary() method"

	| b dict absBlock lenBlock typeBlock type |
	b := builtins ___instance___.
	dict := b asSymbolDictionary.

	"Verify it returns a SymbolDictionary"
	self assert: (dict isKindOf: SymbolDictionary).

	"Verify it contains expected built-in functions"
	self assert: (dict includesKey: #abs).
	self assert: (dict includesKey: #len).
	self assert: (dict includesKey: #type).
	self assert: (dict includesKey: #repr).
	self assert: (dict includesKey: #str).
	self assert: (dict includesKey: #min).
	self assert: (dict includesKey: #max).
	self assert: (dict includesKey: #sum).
	self assert: (dict includesKey: #pow).

	"Verify the values are blocks/functions"
	absBlock := dict at: #abs.
	self assert: (absBlock isKindOf: BlockClosure).
	
	lenBlock := dict at: #len.
	self assert: (lenBlock isKindOf: BlockClosure).

	"Verify it does not contain internal methods (starting with ___)"
	dict keys do: [:key |
		| keyStr |
		keyStr := key asString.
		(keyStr size >= 3) ifTrue: [
			self deny: ((keyStr copyFrom: 1 to: 3) = '___')
		]
	].

	"Verify it does not contain asSymbolDictionary itself"
	self deny: (dict includesKey: #asSymbolDictionary).

	"Verify the functions work correctly"
	typeBlock := dict at: #type.
	type := typeBlock value: {42} value: nil.
	self assert: ((type == int) or: [type isSubclassOf: int]).
%




