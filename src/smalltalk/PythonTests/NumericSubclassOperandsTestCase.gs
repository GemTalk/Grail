! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NumericSubclassOperandsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NumericSubclassOperandsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NumericSubclassOperandsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NumericSubclassOperandsTestCase - built-in numbers against int/float subclasses
! ===============================================================================
! A Python subclass of int or float is an AbstractPyInt / AbstractPyFloat
! wrapper, and the kernel's numeric coercion turned it back into a plain number
! before its own reflected methods were asked -- ``1 / MyFloat(2.0)'' never
! reached MyFloat.__rtruediv__ (object >> ___numericReflectedFirst___:selector:).
! The subclass could not defer to float through super() either: the parent chain
! is AbstractPyFloat, Number, Object (Super >> ___superValueMethodFor___:), and
! float had no reflected methods at all (float >> ___reflectedOperand___:).
! Found through test_statistics TestHarmonicMean.test_types_conserved; the
! vars() checks are its TestNormalDist.test_slots.
!
! Every check is verified against real CPython by running the fixture directly;
! see tests/python/numeric_subclass_operands.py.

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
NumericSubclassOperandsTestCase removeAllMethods: 0.
NumericSubclassOperandsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Support'
method: NumericSubclassOperandsTestCase
assertChecks: names
	"Each named fixture function answers True -- it matches CPython."

	| mod |
	importlib @env1:modules removeKey: #'numeric_subclass_operands' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/numeric_subclass_operands.py')
		name: 'numeric_subclass_operands'.
	names do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'numeric subclass check failed: ' , k]
%

category: 'Grail-Tests'
method: NumericSubclassOperandsTestCase
testTheRightOperandIsAskedFirst
	"CPython asks a float subclass first when the left operand is an int or a
	bool (whose methods answer NotImplemented for a float), and asks an
	overriding subclass of the left operand's own type first -- and in neither
	other case."

	self assertChecks: #(
		'an_int_left_operand_lets_a_float_subclass_divide'
		'a_float_left_operand_gives_a_float_subclass_priority'
		'a_bool_left_operand_lets_a_float_subclass_subtract'
		'an_int_left_operand_gives_an_int_subclass_priority'
		'a_float_left_operand_keeps_an_int_subclass_forward'
		'a_bool_left_operand_keeps_an_int_subclass_forward'
		'the_subclass_forward_method_still_runs_first_from_the_left'
		'a_reflected_power_reaches_the_subclass'
		'an_unoverridden_subclass_divides_like_its_base' )
%

category: 'Grail-Tests'
method: NumericSubclassOperandsTestCase
testTrueDivisionOfIntegersIsAFloat
	"``1 / MyInt(2)'' and ``True / 2'' answered an exact Smalltalk Fraction."

	self assertChecks: #(
		'an_int_divided_by_an_int_subclass_is_a_float'
		'a_bool_divided_by_an_int_is_a_float' )
%

category: 'Grail-Tests'
method: NumericSubclassOperandsTestCase
testFloatHasTheReflectedMethods
	"float.__radd__ and the rest exist, answer NotImplemented for an operand
	float does not take, and leave the operator's TypeError as it was."

	self assertChecks: #(
		'float_has_the_reflected_methods'
		'a_float_reflected_method_declines_a_non_number'
		'a_float_reflected_division_by_zero_raises'
		'none_plus_a_float_is_still_a_type_error' )
%

category: 'Grail-Tests'
method: NumericSubclassOperandsTestCase
testVarsOfAnInstanceWithNoDict
	"vars() refuses a strict-slots instance and still answers the __dict__ of a
	slotted class whose base is a plain class."

	self assertChecks: #(
		'vars_refuses_an_instance_with_no_dict'
		'vars_answers_the_dict_of_a_slotted_class_under_a_plain_base' )
%
