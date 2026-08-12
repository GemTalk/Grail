! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'TimedeltaFloatOperandTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TimedeltaFloatOperandTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TimedeltaFloatOperandTestCase - timedelta arithmetic with a float SUBCLASS
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TimedeltaFloatOperandTestCase removeAllMethods.
TimedeltaFloatOperandTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - timedelta'
method: TimedeltaFloatOperandTestCase
testTimedeltaFloatOperand
	"timedelta * / a float SUBCLASS must go through the float path, and a
	malformed as_integer_ratio must raise TypeError/ValueError.

	Two bugs, both in PyTimedelta's float path.  It was gated on
	``isKindOf: Float'', which a float SUBCLASS is not -- the kernel Float
	is sealed, so ``class F(float)'' becomes an AbstractPyFloat wrapper (a
	Number, but not a Float) -- so such an operand took the INTEGER path
	and a subclass overriding as_integer_ratio was ignored entirely.

	And __truediv__ tested for a zero divisor BEFORE consulting
	as_integer_ratio.  CPython has no explicit zero check at all: it calls
	as_integer_ratio first, and ZeroDivisionError only falls out of the
	division afterwards.  Because a BadFloat() IS 0.0, the early check
	pre-empted the TypeError/ValueError a malformed ratio owes -- which is
	why the validation added earlier had never actually been reachable.

	Pinned alongside: genuine zero divisors (int, float, timedelta,
	floordiv) still raise ZeroDivisionError; an INT subclass still takes
	the integer path; and ordinary arithmetic keeps its exact
	integer-ratio rounding rather than binary float error (issue #23521)."

	| mod results |
	importlib @env1:modules removeKey: #'timedelta_float_operand' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/timedelta_float_operand.py')
		name: 'timedelta_float_operand'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('div_bad_ratio_type' 'mul_bad_ratio_type'
	  'div_bad_ratio_value_0' 'mul_bad_ratio_value_0'
	  'div_bad_ratio_value_1' 'mul_bad_ratio_value_1'
	  'div_bad_ratio_value_2' 'mul_bad_ratio_value_2'
	  'div_int_zero' 'div_float_zero' 'div_timedelta_zero' 'floordiv_zero'
	  'mul_float_subclass' 'div_float_subclass' 'mul_float_subclass_exact'
	  'mul_int_subclass' 'div_int_subclass'
	  'mul_float_exact' 'div_float' 'div_int' 'mul_int' 'div_timedelta'
	  'mul_negative_float' 'div_negative_float') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
