! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OperatorSemanticsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OperatorSemanticsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OperatorSemanticsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OperatorSemanticsTestCase
!
! Regression coverage for a batch of operator / dispatch fixes (see
! tests/python/operator_semantics.py for the details of each):
!
!  1. Context-manager __exit__ dispatch.  ``def __exit__(self, *exc)''
!     (varargs -- the common form, incl. test.support.swap_item) was
!     unreachable through a normal call or a ``with'' statement: ``object''s
!     kernel-tail default dunders were misread as class-side methods by
!     ___pyAttrLoad___, binding __exit__ to the class and raising
!     "does not support the context manager protocol".  Fixed with an
!     ``isMeta'' gate in ___pyAttrLoad___ plus a WithAst change routing
!     __exit__ through the varargs-aware ``value:value:'' call.
!
!  2. ``a << b'' / ``a >> b'' with a negative shift count -> ValueError
!     (previously Smalltalk ``bitShift:'' sign-flipped and returned a value).
!
!  3. Augmented assignment ``a += b'' now tries ``__iadd__'' before falling
!     back to ``__add__'' (object>>___augmentedOp___:inplace:binary:).
!
!  4. The ``operator'' module: concat/iconcat reject non-sequences, and each
!     operation is exposed under both its plain and dunder name with the SAME
!     identity (``operator.__add__ is operator.add'').
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OperatorSemanticsTestCase removeAllMethods.
OperatorSemanticsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OperatorSemanticsTestCase
setUp
	"Reload tests/python/operator_semantics.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	"Evict the fixture so it reloads from disk each run.  Do NOT evict
	``operator'': it is a canonical (deployed) module in the warm suite, and
	removing a canonical module then re-importing it raises ImportError.  The
	deployed ``operator'' is built from the current operator.py at install, so
	the fixture's ``import operator'' already sees the fixes."
	mods removeKey: #'operator_semantics' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/operator_semantics.py')
		name: 'operator_semantics'.
%

! --- 1. Context managers ---

category: 'Grail-Tests - Context Manager'
method: OperatorSemanticsTestCase
testWithEntersVarargsContextManager
	"``with cm:'' runs __enter__ on a user context manager."

	self assert: (testModule @env1:cm_varargs_entered) equals: true
%

category: 'Grail-Tests - Context Manager'
method: OperatorSemanticsTestCase
testWithCallsVarargsExitWithThreeArgs
	"A varargs ``__exit__(self, *exc)'' is reached by ``with'' with the
	three protocol args (None, None, None on a clean exit)."

	self assert: (testModule @env1:cm_varargs_exit_argc) equals: 3
%

category: 'Grail-Tests - Context Manager'
method: OperatorSemanticsTestCase
testWithCallsFixedExitWithThreeArgs
	"A fixed-arity ``__exit__(self, a, b, c)'' is reached by ``with''."

	self assert: (testModule @env1:cm_fixed_exit_argc) equals: 3
%

category: 'Grail-Tests - Context Manager'
method: OperatorSemanticsTestCase
testWithExitReturningFalseDoesNotSuppress
	"__exit__ returning False must let the exception propagate."

	self assert: (testModule @env1:cm_exit_does_not_suppress) equals: 'propagated'
%

category: 'Grail-Tests - Context Manager'
method: OperatorSemanticsTestCase
testVarargsExitReachableByNormalCall
	"``obj.__exit__(a, b, c)'' (a plain call, not via ``with'') reaches the
	varargs __exit__ rather than object's context-manager default."

	self assert: (testModule @env1:cm_call_exit_directly) equals: 3
%

! --- 2. Negative shift ---

category: 'Grail-Tests - Shift'
method: OperatorSemanticsTestCase
testLeftShiftPositive
	"5 << 1 = 10 (unaffected by the negative-count guard)."

	self assert: (testModule @env1:lshift_ten) equals: 10
%

category: 'Grail-Tests - Shift'
method: OperatorSemanticsTestCase
testRightShiftPositive
	"5 >> 1 = 2 (unaffected by the negative-count guard)."

	self assert: (testModule @env1:rshift_two) equals: 2
%

category: 'Grail-Tests - Shift'
method: OperatorSemanticsTestCase
testLeftShiftNegativeCountRaisesValueError
	"2 << -1 raises ValueError, not a sign-flipped bitShift result."

	self assert: (testModule @env1:lshift_negative) equals: 'ValueError'
%

category: 'Grail-Tests - Shift'
method: OperatorSemanticsTestCase
testRightShiftNegativeCountRaisesValueError
	"2 >> -1 raises ValueError."

	self assert: (testModule @env1:rshift_negative) equals: 'ValueError'
%

! --- 3. Augmented assignment ---

category: 'Grail-Tests - Augmented Assignment'
method: OperatorSemanticsTestCase
testAugAddDispatchesIadd
	"``x += 1'' uses __iadd__ when defined."

	self assert: (testModule @env1:aug_iadd) equals: 'iadd'
%

category: 'Grail-Tests - Augmented Assignment'
method: OperatorSemanticsTestCase
testAugSubDispatchesIsub
	"``x -= 1'' uses __isub__."

	self assert: (testModule @env1:aug_isub) equals: 'isub'
%

category: 'Grail-Tests - Augmented Assignment'
method: OperatorSemanticsTestCase
testAugMulDispatchesImul
	"``x *= 2'' uses __imul__."

	self assert: (testModule @env1:aug_imul) equals: 'imul'
%

category: 'Grail-Tests - Augmented Assignment'
method: OperatorSemanticsTestCase
testAugXorDispatchesIxor
	"``x ^= 1'' uses __ixor__."

	self assert: (testModule @env1:aug_ixor) equals: 'ixor'
%

category: 'Grail-Tests - Augmented Assignment'
method: OperatorSemanticsTestCase
testAugAddIntCounterNoRegression
	"``i += 1'' on a plain int still works (falls back to __add__)."

	self assert: (testModule @env1:aug_int_counter) equals: 5
%

category: 'Grail-Tests - Augmented Assignment'
method: OperatorSemanticsTestCase
testAugAddListExtendNoRegression
	"``lst += [2, 3]'' still extends a list."

	self assert: (testModule @env1:aug_list_extend) equals: true
%

category: 'Grail-Tests - Augmented Assignment'
method: OperatorSemanticsTestCase
testAugAddIntToFloatNoRegression
	"``x += 1.5'' on an int yields a float (binary __add__ fallback)."

	self assert: (testModule @env1:aug_int_to_float) equals: 1.5
%

! --- 4. operator module ---

category: 'Grail-Tests - operator module'
method: OperatorSemanticsTestCase
testOperatorConcatLists
	"operator.concat concatenates sequences."

	self assert: (testModule @env1:op_concat_lists) equals: true
%

category: 'Grail-Tests - operator module'
method: OperatorSemanticsTestCase
testOperatorConcatNumbersRaisesTypeError
	"operator.concat(13, 29) raises TypeError (numbers are not sequences)."

	self assert: (testModule @env1:op_concat_numbers) equals: 'TypeError'
%

category: 'Grail-Tests - operator module'
method: OperatorSemanticsTestCase
testOperatorIconcatNumbersMessage
	"operator.iconcat(1, 0.5) raises TypeError naming the Python type."

	self assert: (testModule @env1:op_iconcat_numbers_msg)
		equals: '''int'' object can''t be concatenated'
%

category: 'Grail-Tests - operator module'
method: OperatorSemanticsTestCase
testOperatorDunderAliasesAreOriginal
	"Every operator op is exposed under both its plain and dunder name with
	the SAME object identity (operator.__add__ is operator.add)."

	self assert: (testModule @env1:op_dunder_is_original) equals: 'ALL_MATCH'
%

! --- 5. type() metaclass identity ---

category: 'Grail-Tests - type identity'
method: OperatorSemanticsTestCase
testTypeIsType
	"``type is type'' — the type builtin is an identity-stable singleton."

	self assert: (testModule @env1:type_is_type) equals: true
%

category: 'Grail-Tests - type identity'
method: OperatorSemanticsTestCase
testTypeOfClassIsType
	"``type(cls) is type'' for classes (int / TypeError / LookupError)."

	self assert: (testModule @env1:type_of_class_is_type) equals: true
%

category: 'Grail-Tests - type identity'
method: OperatorSemanticsTestCase
testTypeOfInstanceIsNotType
	"``type(x) is type'' is False for instances (incl. NotImplemented)."

	self assert: (testModule @env1:type_of_instance_is_not_type) equals: true
%

category: 'Grail-Tests - type identity'
method: OperatorSemanticsTestCase
testTypeOfInstanceReturnsClass
	"``type(instance)'' still returns the instance's class (unchanged)."

	self assert: (testModule @env1:type_of_instance_returns_class) equals: true
%

category: 'Grail-Tests - type identity'
method: OperatorSemanticsTestCase
testIsinstanceClassOfType
	"isinstance(cls, type) stays True; isinstance(instance, type) False."

	self assert: (testModule @env1:isinstance_class_of_type) equals: true
%

category: 'Grail-Tests - type identity'
method: OperatorSemanticsTestCase
testLengthHintClassValuedHint
	"operator.length_hint: a class-valued __length_hint__ raises via
	``type(v) is type'' — TypeError swallowed to default, LookupError propagates."

	self assert: (testModule @env1:length_hint_class_raises_default) equals: true
%

category: 'Grail-Tests - type identity'
method: OperatorSemanticsTestCase
testLengthHintIterator
	"operator.length_hint(iter(seq)) uses list_iterator __length_hint__
	(remaining count), decreasing as items are consumed."

	self assert: (testModule @env1:length_hint_iterator) equals: true
%
