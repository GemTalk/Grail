! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuiltinsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BuiltinsTestCase category: 'SUnit'
%

! ===============================================================================
! BuiltinsTestCase - Tests for Python builtins module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
BuiltinsTestCase removeAllMethods: 0.
BuiltinsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testAbs
	"Test abs() function"

	| b absBlock result |
	b := builtins ___instance___.
	absBlock := b @env1:abs.

	result := absBlock value: {5} value: nil.
	self assert: result equals: 5.

	result := absBlock value: {-5} value: nil.
	self assert: result equals: 5.

	result := absBlock value: {0} value: nil.
	self assert: result equals: 0.

	result := absBlock value: {-3.14} value: nil.
	self assert: (result - 3.14) abs < 0.0001
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testAll
	"Test all() function"

	| b allBlock result lst |
	b := builtins ___instance___.
	allBlock := b @env1:all.

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
	anyBlock := b @env1:any.

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

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testBin
	"Test bin() function"

	| b binBlock result |
	b := builtins ___instance___.
	binBlock := b @env1:bin.

	result := binBlock value: {5} value: nil.
	self assert: result equals: '0b101'.

	result := binBlock value: {8} value: nil.
	self assert: result equals: '0b1000'.

	result := binBlock value: {0} value: nil.
	self assert: result equals: '0b0'
%

category: 'Tests - Introspection'
method: BuiltinsTestCase
testCallable
	"Test callable() function"

	| b callableBlock method result lst |
	b := builtins ___instance___.
	callableBlock := b @env1:callable.
	method := b @env1:abs.
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

category: 'Tests - String Functions'
method: BuiltinsTestCase
testChr
	"Test chr() function"

	| b chrBlock result |
	b := builtins ___instance___.
	chrBlock := b @env1:chr.

	result := chrBlock value: {65} value: nil.
	self assert: result equals: 'A'.

	result := chrBlock value: {97} value: nil.
	self assert: result equals: 'a'.

	result := chrBlock value: {48} value: nil.
	self assert: result equals: '0'
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testDivmod
	"Test divmod() function"

	| b divmodBlock result quotient remainder |
	b := builtins ___instance___.
	divmodBlock := b @env1:divmod.

	result := divmodBlock value: {10. 3} value: nil.
	quotient := result @env1:__getitem__: 0.
	remainder := result @env1:__getitem__: 1.
	self assert: quotient equals: 3.
	self assert: remainder equals: 1.

	result := divmodBlock value: {17. 5} value: nil.
	quotient := result @env1:__getitem__: 0.
	remainder := result @env1:__getitem__: 1.
	self assert: quotient equals: 3.
	self assert: remainder equals: 2
%

category: 'Tests - Sequence Functions'
method: BuiltinsTestCase
testEnumerate
	"Test enumerate() function"

	| b enumerateBlock result lst iter first second |
	b := builtins ___instance___.
	enumerateBlock := b @env1:enumerate.

	lst := list withAll: #('a' 'b' 'c').
	result := enumerateBlock value: {lst} value: nil.

	first := result @env1:__next__.
	self assert: (first @env1:__getitem__: 0) equals: 0.
	self assert: (first @env1:__getitem__: 1) equals: 'a'.

	second := result @env1:__next__.
	self assert: (second @env1:__getitem__: 0) equals: 1.
	self assert: (second @env1:__getitem__: 1) equals: 'b'
%

category: 'Tests - Eval - Numeric Functions'
method: BuiltinsTestCase
testEvalAbs
	"Test abs() via Python source"

	self assert: (self eval: 'abs(5)') equals: 5.
	self assert: (self eval: 'abs(-5)') equals: 5.
	self assert: (self eval: 'abs(0)') equals: 0.
%

category: 'Tests - Eval - Numeric Functions'
method: BuiltinsTestCase
testEvalBin
	"Test bin() via Python source"

	self assert: (self eval: 'bin(5)') equals: '0b101'.
	self assert: (self eval: 'bin(0)') equals: '0b0'.
%

category: 'Tests - Eval - String Functions'
method: BuiltinsTestCase
testEvalChr
	"Test chr() via Python source"

	self assert: (self eval: 'chr(65)') equals: 'A'.
	self assert: (self eval: 'chr(97)') equals: 'a'.
%

category: 'Tests - Eval - Numeric Functions'
method: BuiltinsTestCase
testEvalHex
	"Test hex() via Python source"

	self assert: (self eval: 'hex(255)') equals: '0xff'.
	self assert: (self eval: 'hex(0)') equals: '0x0'.
%

category: 'Tests - Eval - Type Functions'
method: BuiltinsTestCase
testEvalLen
	"Test len() via Python source"

	self assert: (self eval: 'len("hello")') equals: 5.
	self assert: (self eval: 'len([1, 2, 3])') equals: 3.
	self assert: (self eval: 'len("")') equals: 0.
%

category: 'Tests - Eval - Aggregation Functions'
method: BuiltinsTestCase
testEvalMax
	"Test max() via Python source"

	self assert: (self eval: 'max([5, 2, 8, 1, 9])') equals: 9.
%

category: 'Tests - Eval - Aggregation Functions'
method: BuiltinsTestCase
testEvalMin
	"Test min() via Python source"

	self assert: (self eval: 'min([5, 2, 8, 1, 9])') equals: 1.
%

category: 'Tests - Eval - Numeric Functions'
method: BuiltinsTestCase
testEvalOct
	"Test oct() via Python source"

	self assert: (self eval: 'oct(8)') equals: '0o10'.
	self assert: (self eval: 'oct(0)') equals: '0o0'.
%

category: 'Tests - Eval - String Functions'
method: BuiltinsTestCase
testEvalOrd
	"Test ord() via Python source"

	self assert: (self eval: 'ord("A")') equals: 65.
	self assert: (self eval: 'ord("a")') equals: 97.
%

category: 'Tests - Eval - Math Functions'
method: BuiltinsTestCase
testEvalPow
	"Test pow() via Python source"

	self assert: (self eval: 'pow(2, 3)') equals: 8.
	self assert: (self eval: 'pow(10, 0)') equals: 1.
%

category: 'Tests - Eval - String Functions'
method: BuiltinsTestCase
testEvalRepr
	"Test repr() via Python source"

	self assert: (self eval: 'repr(42)') equals: '42'.
%

category: 'Tests - Eval - Math Functions'
method: BuiltinsTestCase
testEvalRound
	"Test round() via Python source"

	self assert: (self eval: 'round(3.7)') equals: 4.
	self assert: (self eval: 'round(3.2)') equals: 3.
%

category: 'Tests - Eval - Sequence Functions'
method: BuiltinsTestCase
testEvalSorted
	"Test sorted() via Python source"

	| result |
	result := self eval: 'sorted([3, 1, 4, 1, 5])'.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 4) equals: 5.
%

category: 'Tests - Eval - String Functions'
method: BuiltinsTestCase
testEvalStr
	"Test str() via Python source"

	self assert: (self eval: 'str(42)') equals: '42'.
	self assert: (self eval: 'str(True)') equals: 'True'.
%

category: 'Tests - Eval - Aggregation Functions'
method: BuiltinsTestCase
testEvalSum
	"Test sum() via Python source"

	self assert: (self eval: 'sum([1, 2, 3, 4, 5])') equals: 15.
	self assert: (self eval: 'sum([])') equals: 0.
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testHash
	"Test hash() function"

	| b hashBlock result |
	b := builtins ___instance___.
	hashBlock := b @env1:hash.

	result := hashBlock value: {42} value: nil.
	self assert: (result isKindOf: Integer).

	result := hashBlock value: {'hello'} value: nil.
	self assert: (result isKindOf: Integer)
%

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testHex
	"Test hex() function"

	| b hexBlock result |
	b := builtins ___instance___.
	hexBlock := b @env1:hex.

	result := hexBlock value: {255} value: nil.
	self assert: result equals: '0xff'.

	result := hexBlock value: {16} value: nil.
	self assert: result equals: '0x10'.

	result := hexBlock value: {0} value: nil.
	self assert: result equals: '0x0'
%

category: 'Tests - Introspection'
method: BuiltinsTestCase
testId
	"Test id() function"

	| b idBlock result obj1 obj2 id1 id2 |
	b := builtins ___instance___.
	idBlock := b @env1:id.

	obj1 := list new.
	obj2 := list new.

	id1 := idBlock value: {obj1} value: nil.
	id2 := idBlock value: {obj2} value: nil.

	self assert: (id1 isKindOf: Integer).
	self assert: (id2 isKindOf: Integer).
	self deny: id1 == id2
%

category: 'Tests - Type Checking'
method: BuiltinsTestCase
testIsinstance
	"Test isinstance() function"

	| b isinstanceBlock result lst |
	b := builtins ___instance___.
	isinstanceBlock := b @env1:isinstance.

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

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testLen
	"Test len() function"

	| b lenBlock result lst |
	b := builtins ___instance___.
	lenBlock := b @env1:len.

	result := lenBlock value: {'hello'} value: nil.
	self assert: result equals: 5.

	lst := list new.
	lst @env1:append: 1.
	lst @env1:append: 2.
	lst @env1:append: 3.
	result := lenBlock value: {lst} value: nil.
	self assert: result equals: 3
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testLenTypeError
	"Test that len() raises TypeError for objects without __len__"

	| b lenBlock |
	b := builtins ___instance___.
	lenBlock := b @env1:len.

	self should: [
		lenBlock value: {42} value: nil.
	] raise: TypeError
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testMax
	"Test max() function"

	| b maxBlock result lst |
	b := builtins ___instance___.
	maxBlock := b @env1:max.

	lst := list withAll: #(5 2 8 1 9).
	result := maxBlock value: {lst} value: nil.
	self assert: result equals: 9.

	lst := list withAll: #(-5 -2 -8).
	result := maxBlock value: {lst} value: nil.
	self assert: result equals: -2
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testMin
	"Test min() function"

	| b minBlock result lst |
	b := builtins ___instance___.
	minBlock := b @env1:min.

	lst := list withAll: #(5 2 8 1 9).
	result := minBlock value: {lst} value: nil.
	self assert: result equals: 1.

	lst := list withAll: #(-5 -2 -8).
	result := minBlock value: {lst} value: nil.
	self assert: result equals: -8
%

category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testOct
	"Test oct() function"

	| b octBlock result |
	b := builtins ___instance___.
	octBlock := b @env1:oct.

	result := octBlock value: {8} value: nil.
	self assert: result equals: '0o10'.

	result := octBlock value: {64} value: nil.
	self assert: result equals: '0o100'.

	result := octBlock value: {0} value: nil.
	self assert: result equals: '0o0'
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testOrd
	"Test ord() function"

	| b ordBlock result |
	b := builtins ___instance___.
	ordBlock := b @env1:ord.

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
	ordBlock := b @env1:ord.

	self should: [
		ordBlock value: {'hello'} value: nil.
	] raise: TypeError.

	self should: [
		ordBlock value: {''} value: nil.
	] raise: TypeError
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testPow
	"Test pow() function"

	| b powBlock result |
	b := builtins ___instance___.
	powBlock := b @env1:pow.

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
	powModBlock := b @env1:powWithMod.

	result := powModBlock value: {2. 3. 5} value: nil.
	self assert: result equals: 3.

	result := powModBlock value: {10. 2. 7} value: nil.
	self assert: result equals: 2
%

category: 'Tests - System Functions'
method: BuiltinsTestCase
testQuit
	"Test quit() function is defined and callable"

	| b quitBlock callableBlock |
	b := builtins ___instance___.
	quitBlock := b @env1:quit.
	"Verify quit is defined"
	self assert: quitBlock notNil.

	"Verify quit is callable (responds to value:value:)"
	callableBlock := b @env1:callable.
	self assert: (callableBlock value: {quitBlock} value: nil)
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testRepr
	"Test repr() function"

	| b reprBlock result |
	b := builtins ___instance___.
	reprBlock := b @env1:repr.

	result := reprBlock value: {'hello'} value: nil.
	self assert: (result includesString: 'hello').

	result := reprBlock value: {42} value: nil.
	self assert: result equals: '42'
%

category: 'Tests - Math Functions'
method: BuiltinsTestCase
testRound
	"Test round() function"

	| b roundBlock result |
	b := builtins ___instance___.
	roundBlock := b @env1:round.

	result := roundBlock value: {3.7} value: nil.
	self assert: result equals: 4.

	result := roundBlock value: {3.2} value: nil.
	self assert: result equals: 3.

	result := roundBlock value: {-2.8} value: nil.
	self assert: result equals: -3
%

category: 'Tests - Sequence Functions'
method: BuiltinsTestCase
testSorted
	"Test sorted() function - returns a new sorted list, leaving original unchanged"

	| b sortedBlock result lst |
	b := builtins ___instance___.
	sortedBlock := b @env1:sorted.

	lst := list withAll: #(3 1 4 1 5 9 2 6).
	result := sortedBlock value: {lst} value: nil.

	"Verify the result is sorted"
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 2.
	self assert: result size equals: 8.

	"Verify the original list is unchanged"
	self assert: (lst @env1:__getitem__: 0) equals: 3.
	self assert: (lst @env1:__getitem__: 1) equals: 1.
	self assert: (lst @env1:__getitem__: 2) equals: 4.
	self assert: lst size equals: 8
%

category: 'Tests - String Functions'
method: BuiltinsTestCase
testStr
	"Test str() function"

	| b strBlock result |
	b := builtins ___instance___.
	strBlock := b @env1:str.

	result := strBlock value: {42} value: nil.
	self assert: result equals: '42'.

	result := strBlock value: {'hello'} value: nil.
	self assert: result equals: 'hello'
%

category: 'Tests - Aggregation Functions'
method: BuiltinsTestCase
testSum
	"Test sum() function"

	| b sumBlock result lst |
	b := builtins ___instance___.
	sumBlock := b @env1:sum.

	lst := list withAll: #(1 2 3 4 5).
	result := sumBlock value: {lst} value: nil.
	self assert: result equals: 15.

	lst := list withAll: #().
	result := sumBlock value: {lst} value: nil.
	self assert: result equals: 0
%

category: 'Tests - Type Functions'
method: BuiltinsTestCase
testType
	"Test type() function"

	| b typeBlock result |
	b := builtins ___instance___.
	typeBlock := b @env1:type.

	result := typeBlock value: {42} value: nil.
	self assert: (42 isKindOf: result).

	result := typeBlock value: {'hello'} value: nil.
	self assert: ('hello' isKindOf: result).

	result := typeBlock value: {list new} value: nil.
	self assert: (list new isKindOf: result)
%

category: 'Tests - Sequence Functions'
method: BuiltinsTestCase
testZip
	"Test zip() function"

	| b zipBlock result lst1 lst2 iterables iter first |
	b := builtins ___instance___.
	zipBlock := b @env1:zip.

	lst1 := list withAll: #(1 2 3).
	lst2 := list withAll: #('a' 'b' 'c').
	iterables := list withAll: {lst1. lst2}.

	result := zipBlock value: {iterables} value: nil.

	first := result @env1:__next__.
	self assert: (first @env1:__getitem__: 0) equals: 1.
	self assert: (first @env1:__getitem__: 1) equals: 'a'
%
