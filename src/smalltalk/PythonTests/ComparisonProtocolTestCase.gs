! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ComparisonProtocolTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ComparisonProtocolTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ComparisonProtocolTestCase comment:
'Python rich-comparison protocol for unsupported operand pairs: mixed
orderings raise a CATCHABLE TypeError via object>>___cmpFallback___:
(previously env-0 comparison primitives raised Smalltalk-level errors
that escaped Python try/except), reflected dunders on user classes get
a chance first, and same-kind orderings (str/tuple/list/bytes/number)
keep working.'
%

expectvalue /Class
doit
ComparisonProtocolTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ComparisonProtocolTestCase removeAllMethods: 0.
ComparisonProtocolTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ComparisonProtocolTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'comparison_protocol' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/comparison_protocol.py')
		name: 'comparison_protocol'.
%

category: 'Grail-Helpers'
method: ComparisonProtocolTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Tests - TypeError'
method: ComparisonProtocolTestCase
testMixedOrderingsRaiseCatchableTypeError
	"Every unsupported operand pair raises TypeError that Python
	try/except CAN catch."

	#('int_lt_str' 'str_lt_int' 'int_lt_none' 'float_lt_str'
	  'bool_lt_str' 'plain_lt_plain' 'tuple_lt_int' 'tuple_lt_list'
	  'list_lt_tuple' 'range_lt_range' 'sort_mixed') do: [:key |
		self assert: ((self resultAt: key) = 'type-error')
			description: key]
%

category: 'Grail-Tests - Orderings'
method: ComparisonProtocolTestCase
testSameKindOrderingsStillWork
	#('str_lt_str' 'tuple_lt_tuple' 'list_lt_list' 'bytes_lt_bytes'
	  'int_lt_float' 'bool_lt_int') do: [:key |
		self assert: ((self resultAt: key) = true)
			description: key]
%

category: 'Grail-Tests - Reflected'
method: ComparisonProtocolTestCase
testReflectedDunderGetsFirstChance
	"``1 < Meters(5)'' dispatches Meters.__gt__(meters, 1) -- the
	reflected operation on the user class -- instead of raising."

	self assert: (self resultAt: 'reflected_gt') equals: true
%

category: 'Grail-Tests - Arithmetic TypeError'
method: ComparisonProtocolTestCase
testMixedArithmeticRaisesCatchableTypeError
	"Unsupported binary-operator pairs raise catchable TypeError
	(previously ``None + 1'' was an env-1 DNU, ``1 + None'' a
	Smalltalk _generality error, and ``[1] + (1,)'' silently
	concatenated)."

	#('none_add_int' 'int_add_none' 'int_add_str' 'str_add_int'
	  'list_add_tuple' 'str_mul_str' 'plain_sub_plain' 'none_mod_int') do: [:key |
		self assert: ((self resultAt: key) = 'type-error')
			description: key]
%

category: 'Grail-Tests - Arithmetic'
method: ComparisonProtocolTestCase
testValidArithmeticStillWorks
	self assert: (self resultAt: 'int_mul_str') equals: 'abab'.
	self assert: (self resultAt: 'str_mul_int') equals: 'abab'.
	self assert: ((self resultAt: 'int_mul_list') @env1:__len__) equals: 2.
	self assert: ((self resultAt: 'tuple_mul_int') @env1:__len__) equals: 2.
	self assert: ((self resultAt: 'bytes_add_bytes') @env1:__len__) equals: 2.
	self assert: (self resultAt: 'bool_add_int') equals: 3.
	self assert: (self resultAt: 'int_pow_int') equals: 32
%

category: 'Grail-Tests - Arithmetic'
method: ComparisonProtocolTestCase
testReflectedArithmeticDunder
	"``1 + Radd()'' dispatches Radd.__radd__(radd, 1)."

	self assert: (self resultAt: 'reflected_radd') equals: 'RADD:1'
%

category: 'Grail-Tests - Index/unary protocol'
method: ComparisonProtocolTestCase
testBadIndexAndUnaryRaiseCatchableTypeError
	"Non-integer indices ([1,2][None], 'ab'[None], range(5)[None]) and
	unary ops on unsupported types (~None, -None) raise catchable
	TypeError instead of uncatchable env-0 comparison DNUs on the index
	(the shapes that kept CPython's test_operator at STERROR)."

	#('list_index_none' 'list_setitem_none' 'list_delitem_none'
	  'str_index_none' 'range_index_none' 'bytes_index_none'
	  'in_none' 'invert_none' 'neg_none') do: [:key |
		self assert: ((self resultAt: key) = 'type-error')
			description: key]
%

category: 'Grail-Tests - Index/unary protocol'
method: ComparisonProtocolTestCase
testValidIndexingStillWorks
	self assert: (self resultAt: 'list_index_ok') equals: 2.
	self assert: (self resultAt: 'str_index_neg') equals: 'c'.
	self assert: (self resultAt: 'range_index_ok') equals: 2
%
