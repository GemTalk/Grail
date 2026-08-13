! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ZeroDivisionErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ZeroDivisionErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ZeroDivisionErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ZeroDivisionErrorTestCase - Tests for Python ZeroDivisionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ZeroDivisionErrorTestCase removeAllMethods.
ZeroDivisionErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ZeroDivisionError'
method: ZeroDivisionErrorTestCase
test_creation
	"Test creating a ZeroDivisionError instance."
	
	| exc |
	exc := ZeroDivisionError ___new___:  ZeroDivisionError .
	self assert: exc notNil.
%

category: 'Grail-Tests-ZeroDivisionError'
method: ZeroDivisionErrorTestCase
test_inheritance
	"Test that ZeroDivisionError inherits from Exception."
	
	| exc |
	exc := ZeroDivisionError ___new___:  ZeroDivisionError .
	self assert: (exc isKindOf: Exception).
%

category: 'Grail-Tests-ZeroDivisionError'
method: ZeroDivisionErrorTestCase
testDivisionByZeroRaisesAndSaysWhatCPythonSays
	"Dividing by zero: that it raises at all, and what it says.

	This began as a wording fix and turned out to be four bugs, because the
	guards were written per operator and each was wrong in a way the others hid.

	THE WORDING.  CPython used to distinguish the operators -- ``integer division
	or modulo by zero'', ``float division by zero'', ``float floor division by
	zero'', ``float modulo'' -- and 3.14 collapsed all of them into ``division by
	zero''.  Grail still said the 3.13 text.  Separately ``0 ** -1'' says ``zero
	to a negative power'', where Grail said ``0.0 cannot be raised to a negative
	power'', which no recent CPython has used.

	FLOAT DIVISION DID NOT RAISE AT ALL.  ``1.0 / 0'' answered inf and
	``1.0 % 0'' answered nan.  IEEE 754 says those are the right values and
	GemStone obliges; Python's ``/'' is not IEEE division and checks the divisor
	first.  A silently wrong number is worse than a wrong message.

	``False'' WAS NOT RECOGNISED AS A ZERO.  A Python bool IS an int, so
	``1 // False'' is division by zero -- but Grail represents False as the
	Smalltalk ``false'', whose class is Boolean and NOT a Number, so every guard
	shaped ``(other isKindOf: Number) and: [other = 0]'' short-circuited on the
	first clause and never looked at the value, though the second clause would
	have answered true.  ``1 // False'', ``1 % False'' and ``divmod(1, False)''
	then reached the kernel and raised GemStone's ZeroDivide -- not a Python
	exception, so uncatchable from Python at all.  ``1 / False'' took another
	route and answered OverflowError, claiming the quotient was too large for a
	float.

	A COMPLEX ZERO WAS NOT RECOGNISED EITHER: ``(1+2j) / 0'' answered (nan-nanj).

	The guard is now one method, ZeroDivisionError class>>___checkDivisor___:,
	which is why all of these move together.  It tests the TYPE rather than just
	``= 0'', so a user class whose __eq__ claims equality with zero still gets
	its __rtruediv__ -- the fixture checks that too, since it is a deliberate
	limit rather than an oversight.

	Every expectation is verified against real CPython by running the fixture
	directly; see tests/python/division_by_zero.py."

	| mod |
	importlib @env1:modules removeKey: #'division_by_zero' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/division_by_zero.py')
		name: 'division_by_zero'.
	#( 'int_division_says_division_by_zero'
	   'int_floor_division_says_the_same'
	   'int_modulo_says_the_same'
	   'int_divmod_says_the_same'
	   'zero_to_a_negative_power_has_its_own_message'
	   'a_float_zero_to_a_negative_power_says_it_too'
	   'the_builtin_pow_says_it_too'
	   'zero_to_a_non_negative_power_is_fine'
	   'float_true_division_raises'
	   'float_modulo_raises'
	   'float_floor_division_raises'
	   'float_divmod_raises'
	   'a_float_zero_divisor_is_a_zero'
	   'negative_zero_is_a_zero_too'
	   'false_is_a_zero_divisor'
	   'false_is_a_zero_for_floor_division_too'
	   'false_is_a_zero_for_modulo_and_divmod'
	   'a_float_divided_by_false_raises'
	   'true_is_one_and_still_divides'
	   'a_complex_divided_by_zero_raises'
	   'a_complex_zero_is_a_zero_divisor'
	   'a_complex_divided_by_a_nonzero_still_works'
	   'the_error_is_catchable_as_arithmeticerror'
	   'a_bare_except_catches_it'
	   'an_object_merely_equal_to_zero_is_not_a_zero_divisor'
	   'ordinary_division_is_untouched' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'division-by-zero check failed: ' , k].
%
