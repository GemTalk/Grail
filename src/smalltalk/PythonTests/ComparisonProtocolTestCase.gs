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

category: 'Grail-Tests - Reflected'
method: ComparisonProtocolTestCase
testReflectedAliasedDunderPropagatesError
	"A reflected comparison dunder assigned as a class-body ALIAS
	(``__gt__ = __lt__'', not a compiled ``def'') must still be found and
	called: ``10 < AliasCmp()'' dispatches AliasCmp.__gt__(alias, 10) and
	propagates its ZeroDivisionError, matching CPython (test_bisect's
	CmpErr / TestErrorHandling.test_cmp_err).  Regression: ___cmpFallback___
	probed only compiled selectors (whichClassIncludesSelector:) and so
	raised a bogus ``'<' not supported'' TypeError; it now also consults
	___classAttrDunder___ for the class-attribute form.  The direct
	``AliasCmp() < 10'' path (compiled __lt__) must keep propagating too."

	self assert: (self resultAt: 'alias_reflected_lt') equals: 'zde'.
	self assert: (self resultAt: 'alias_direct_lt') equals: 'zde'
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

category: 'Grail-Tests - Reflected equality'
method: ComparisonProtocolTestCase
testReflectedEqualityWhenLeftOperandHasNone
	"``==''/``!='' must hand the comparison to the RIGHT operand's dunder when
	the left one has none of its own: object's default __eq__ answers
	NotImplemented on a mismatch instead of settling it as False
	(CPython's object.__eq__).  Without this, ``NoCmp(1) == EqOnX(1)'' was
	False even though EqOnX.__eq__ says they match -- the shape behind
	test_compare.test_comp_classes_different."

	self assert: (self resultAt: 'nocmp_eq_eqonx') equals: true.
	self assert: (self resultAt: 'eqonx_eq_nocmp') equals: true.
	self assert: (self resultAt: 'nocmp_eq_eqonx_diff') equals: false.
	"__ne__ punts the same way -- to the reflected __ne__, else the
	reflected __eq__ (that is what object.__ne__ derives from)."
	self assert: (self resultAt: 'nocmp_ne_neonx') equals: false.
	self assert: (self resultAt: 'nocmp_ne_eqonx') equals: false
%

category: 'Grail-Tests - Reflected equality'
method: ComparisonProtocolTestCase
testBuiltinsPuntToReflectedEquality
	"Each of these built-ins carries its own __eq__: override that used to
	answer a flat False for a foreign operand, silently skipping the
	reflected __eq__ -- so ``x == ALWAYS_EQ'' (used throughout CPython's
	suite) was False for every one of them.  test_compare.test_issue_1393 /
	test_comparisons."

	#('str_eq_alwayseq' 'none_eq_alwayseq' 'object_eq_alwayseq'
	  'function_eq_alwayseq' 'complex_eq_eqonx') do: [:key |
		self assert: ((self resultAt: key) = true) description: key].
	self assert: (self resultAt: 'str_ne_alwayseq') equals: false
%

category: 'Grail-Tests - Reflected equality'
method: ComparisonProtocolTestCase
testOrdinaryEqualityUnchanged
	"The punt must not turn genuinely-unequal operands equal: with no
	reflected __eq__ to consult, the fallback still ends at identity/value."

	self assert: (self resultAt: 'str_eq_int') equals: false.
	self assert: (self resultAt: 'none_eq_int') equals: false.
	self assert: (self resultAt: 'str_eq_str') equals: true.
	self assert: (self resultAt: 'str_ne_str') equals: true.
	self assert: (self resultAt: 'none_eq_none') equals: true.
	self assert: (self resultAt: 'complex_eq_int') equals: true.
	self assert: (self resultAt: 'complex_ne_int') equals: true
%

category: 'Grail-Tests - Reflected equality'
method: ComparisonProtocolTestCase
testVarargsDunderIsDispatchedInCPythonOrder
	"``def __eq__(*args)'' -- no named receiver -- compiles to ___eq__:kw:
	with NO __eq__: alias, so a plain dunder send missed it entirely and the
	user's method never ran.  The recorded order also pins that a reflected
	__ne__ which declines is NOT followed by that operand's __eq__
	(test_compare.test_ne_high_priority)."

	self assert: (self resultAt: 'ne_call_order')
		equals: 'VarargsLeft.__eq__,VarargsRight.__ne__'
%

category: 'Grail-Tests - Reflected equality'
method: ComparisonProtocolTestCase
testSubclassOperandGetsFirstTurn
	"CPython's subclass-priority rule: when the RIGHT operand's type is a
	proper subclass of the left's and overrides the reflected method, the
	reflected call goes FIRST (test_compare.test_ne_low_priority asserts the
	exact call list)."

	self assert: (self resultAt: 'subclass_priority_order')
		equals: 'PrioDerived.__ne__,PrioBase.__eq__'
%

category: 'Grail-Tests - Orderings'
method: ComparisonProtocolTestCase
testComplexIsUnorderableWithACatchableMessage
	"complex has no ordering.  The raise used env-0 ``TypeError signal:'',
	which reaches Python with an EMPTY message -- catchable, but no
	assertRaisesRegex(TypeError, 'not supported') could match it
	(test_compare.test_numbers).  ___signal___: carries the text, and a
	non-complex operand goes through ___cmpFallback___ so the message names
	BOTH types."

	#('complex_lt_complex' 'complex_lt_int' 'int_lt_complex') do: [:key |
		self assert: ((self resultAt: key) = 'type-error') description: key].
	self assert: (self resultAt: 'complex_lt_msg')
		equals: '''<'' not supported between instances of ''complex'' and ''complex'''.
	self assert: (self resultAt: 'complex_gt_int_msg')
		equals: '''>'' not supported between instances of ''complex'' and ''int'''
%

category: 'Grail-Tests - Orderings'
method: ComparisonProtocolTestCase
testDecimalComparesAcrossTheNumericTower
	"decimal._ratio coerced only Decimal/int/float, so Decimal lost to a
	Fraction (equal values compared unequal) and to a complex with no
	imaginary part.  Ordering against a complex must still raise TypeError --
	CPython widens to complex for == / != ONLY."

	| d |
	d := (self resultAt: 'decimal').
	self assert: (d @env1:__getitem__: 'dec_eq_fraction') equals: true.
	self assert: (d @env1:__getitem__: 'fraction_eq_dec') equals: true.
	self assert: (d @env1:__getitem__: 'dec_eq_complex') equals: true.
	self assert: (d @env1:__getitem__: 'complex_eq_dec') equals: true.
	self assert: (d @env1:__getitem__: 'dec_ne_complex') equals: false.
	self assert: (d @env1:__getitem__: 'dec_lt_fraction') equals: true.
	self assert: (d @env1:__getitem__: 'dec_lt_complex') equals: 'type-error'
%

category: 'Grail-Tests - Index protocol'
method: ComparisonProtocolTestCase
testIndexObjectsDriveEverySequenceOperation
	"PEP 357: an object with __index__ is usable wherever an integer index is.
	Every sequence op used to only PROBE for __index__ and then hand the
	OBJECT to env-0 arithmetic, so it died on an uncatchable ``a newstyle does
	not understand #<'' -- 32 of test_index's 34 errors.  The value has to be
	FETCHED (object>>___asIndex___)."

	| d |
	d := self resultAt: 'index_ops'.
	#('list' 'tuple' 'str' 'bytes' 'bytearray' 'range') do: [:kind |
		#('_getitem' '_getitem_neg' '_slice' '_slice_open' '_slice_step')
			do: [:op |
				self assert: ((d @env1:__getitem__: kind , op) = true)
					description: kind , op]].
	#('list_mul' 'list_rmul' 'tuple_mul' 'str_mul' 'str_rmul' 'list_imul'
	  'list_setitem' 'list_delitem' 'opindex_plain' 'opindex_obj')
		do: [:key |
			self assert: ((d @env1:__getitem__: key) = true) description: key]
%

category: 'Grail-Tests - Index protocol'
method: ComparisonProtocolTestCase
testOperatorIndexUsesAnIntSubclassValueNotItsDunder
	"CPython's PyNumber_Index answers an int's own value even for a SUBCLASS,
	without consulting __index__: MyInt(7).__index__() is 8, but
	operator.index(MyInt(7)) is 7 (test_index.test_int_subclass_with_index).
	operator.py was a bare ``return a.__index__()''."

	| d |
	d := self resultAt: 'index_ops'.
	self assert: (d @env1:__getitem__: 'opindex_int_subclass_uses_value')
		equals: true.
	self assert: (d @env1:__getitem__: 'int_subclass_dunder_still_8')
		equals: true
%

category: 'Grail-Tests - Index protocol'
method: ComparisonProtocolTestCase
testIndexErrorsAreCatchable
	"A non-int __index__ result, a missing __index__, a float subscript: all
	catchable TypeError with CPython's wording.  ``'a' * 2**100'' is an
	OverflowError -- Grail used to attempt the allocation and bring the
	session down with AlmostOutOfMemory (test_index.OverflowTestCase)."

	| d |
	d := self resultAt: 'index_errors'.
	#('nonint_index_result' 'nonint_slice_bound' 'opindex_nonint_result'
	  'opindex_no_index' 'float_index') do: [:key |
		self assert: ((d @env1:__getitem__: key) = 'type-error')
			description: key].
	#('repeat_huge' 'repeat_huge_negative' 'repeat_huge_list') do: [:key |
		self assert: ((d @env1:__getitem__: key) = 'overflow')
			description: key].
	self assert: (d @env1:__getitem__: 'str_index_msg')
		equals: 'string indices must be integers, not NoneType'.
	self assert: (d @env1:__getitem__: 'list_index_msg')
		equals: 'list indices must be integers or slices, not NoneType'
%

category: 'Grail-Tests - Index protocol'
method: ComparisonProtocolTestCase
testIndexReturningAnIntSubclassWarns
	"CPython deprecates __index__ answering a strict int subclass (True, say):
	DeprecationWarning, and the result is normalized to an exact int
	(test_index.test_index_returns_int_subclass)."

	self assert: (self resultAt: 'index_deprecation') asArray
		equals: #( true true true )
%
