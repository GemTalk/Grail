! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AugmentedAssignmentTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AugmentedAssignmentTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AugmentedAssignmentTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AugmentedAssignmentTestCase
!
! ``x op= y'' for every kind of target.
!
! An augmented assignment is not a read, a binary operation and a store.  It
! tries the IN-PLACE dunder first (__iadd__, __ior__, ...) so a mutable object
! is mutated rather than replaced, and when the forward binary dunder DECLINES
! -- answers NotImplemented -- it tries the right operand's reflected one,
! exactly as the plain operator does.
!
! Grail did that for ONE kind of target: a plain local name inside a function.
! For a MODULE-SCOPE name, an ATTRIBUTE and a SUBSCRIPT, AugAssignAst emitted
! the bare binary operator, so neither half happened:
!
!   * the in-place dunder never ran.  ``d |= other'' at module scope built a
!     NEW dict and rebound the name, so any other name bound to the same object
!     kept the old contents.  ``l += [x]'' on a list is the common spelling of
!     the same thing, and ``self.data |= other'' -- which is how UserDict is
!     written -- is the same bug through the attribute emitter.
!
!   * the reflected dunder never ran, and THIS ONE PRODUCES A VALUE rather than
!     an error:
!
!         d = {0: 'a'}
!         d |= types.MappingProxyType({1: 'c'})    # d is NotImplemented
!
!     while ``d | proxy'' on the line above answers a dict.  NotImplemented was
!     stored and the failure surfaced wherever d was next read, which is why
!     the same statement in two scopes disagreeing went unnoticed for so long.
!
! HOW IT WAS FOUND, because the route matters more than the bug.  Making
! types.MappingProxyType a real proxy (it had been a stub that answered its
! argument) turned test_userdict's test_mixed_or and test_mixed_ior red.  They
! loop over UserDict, dict and MappingProxyType -- so with the stub in place
! the third case had been testing a plain dict for the second time, and both
! tests had been passing VACUOUSLY.  Fixing the stub is what made them run,
! and what they then found was this.
!
! Every check is written at BOTH scopes: a fix that corrected module scope and
! left functions alone would otherwise look complete.  The immutable rows (int,
! str, tuple) are the control in the other direction -- they have no in-place
! dunder, so they must behave exactly as before.
!
! Drives tests/python/augmented_assignment.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AugmentedAssignmentTestCase removeAllMethods.
AugmentedAssignmentTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AugmentedAssignmentTestCase
setUp
	"Reload tests/python/augmented_assignment.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'augmented_assignment' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/augmented_assignment.py')
		name: 'augmented_assignment'.
%

category: 'Grail-Private'
method: AugmentedAssignmentTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - Module scope'
method: AugmentedAssignmentTestCase
testAModuleScopeTargetMutatesInPlace
	"The IDENTITY assertion is the one that matters.  Comparing values alone
	passes whether the object was mutated or replaced, which is exactly the
	difference this branch used to get wrong -- and the difference is only
	visible to a second name bound to the same object."

	self assertMatchesCPythonAt: 'module_dict_ior_value'.
	self assertMatchesCPythonAt: 'module_dict_ior_in_place'.
	self assertMatchesCPythonAt: 'module_list_iadd_value'.
	self assertMatchesCPythonAt: 'module_list_iadd_in_place'.
	self assertMatchesCPythonAt: 'module_set_ior_value'.
	self assertMatchesCPythonAt: 'module_set_ior_in_place'.
	self assertMatchesCPythonAt: 'module_inplace_dunder_ran'.
%

category: 'Grail-Tests - Module scope'
method: AugmentedAssignmentTestCase
testAModuleScopeTargetReachesTheReflectedOperator
	"A forward dunder that declines must not have its NotImplemented STORED.
	That is the half that produces a value rather than an error, so it cannot
	be caught by watching for exceptions."

	self assertMatchesCPythonAt: 'module_reflected_proxy'.
	self assertMatchesCPythonAt: 'module_reflected_custom'.
%

category: 'Grail-Tests - Attribute targets'
method: AugmentedAssignmentTestCase
testAnAttributeTargetTakesTheSameProtocol
	"``obj.x op= v'' and ``self.x op= v'' take DIFFERENT emits -- the
	polymorphic attribute protocol and the instance's own storage -- so both
	are probed rather than one assumed to follow from the other.
	``self.data |= other'' is how UserDict.__ior__ is written, which is how
	this reached test_userdict."

	self assertMatchesCPythonAt: 'attr_list_iadd_value'.
	self assertMatchesCPythonAt: 'attr_list_iadd_in_place'.
	self assertMatchesCPythonAt: 'attr_reflected_proxy'.
	self assertMatchesCPythonAt: 'attr_inplace_dunder_ran'.
	self assertMatchesCPythonAt: 'self_attr_in_place'.
	self assertMatchesCPythonAt: 'self_attr_reflected_proxy'.
%

category: 'Grail-Tests - Subscript targets'
method: AugmentedAssignmentTestCase
testASubscriptTargetTakesTheSameProtocol
	"``d[k] += [x]'' must extend the list already at d[k] rather than build a
	new one and store it over the top."

	self assertMatchesCPythonAt: 'subscript_list_iadd_value'.
	self assertMatchesCPythonAt: 'subscript_list_iadd_in_place'.
	self assertMatchesCPythonAt: 'subscript_reflected_proxy'.
	self assertMatchesCPythonAt: 'subscript_inplace_dunder_ran'.
%

category: 'Grail-Tests - Controls'
method: AugmentedAssignmentTestCase
testAFunctionLocalTargetIsUnchanged
	"This branch was always correct, and is the reason the others went
	unnoticed: the same statement worked in a function and not at module
	scope.  Here so a fix cannot trade one for the other."

	self assertMatchesCPythonAt: 'function_reflected_proxy'.
	self assertMatchesCPythonAt: 'function_dict_in_place'.
	self assertMatchesCPythonAt: 'function_list_iadd_value'.
	self assertMatchesCPythonAt: 'function_list_in_place'.
	self assertMatchesCPythonAt: 'function_inplace_dunder_ran'.
%

category: 'Grail-Tests - Controls'
method: AugmentedAssignmentTestCase
testImmutableTargetsAreUnaffected
	"int, str and tuple have no in-place dunder, so ``x += y'' must still
	build a new object and rebind -- the tuple row asserts the REPLACEMENT
	explicitly, which is the mirror image of the in-place assertions above."

	self assertMatchesCPythonAt: 'module_int_iadd'.
	self assertMatchesCPythonAt: 'module_str_iadd'.
	self assertMatchesCPythonAt: 'module_tuple_iadd'.
	self assertMatchesCPythonAt: 'module_tuple_is_replaced'.
	self assertMatchesCPythonAt: 'attr_int_iadd'.
	self assertMatchesCPythonAt: 'subscript_int_iadd'.
%

category: 'Grail-Tests - Controls'
method: AugmentedAssignmentTestCase
testThePlainOperatorAndTheAugmentedOneNowAgree
	"The fix closed a gap between two SPELLINGS of one operator.  These rows
	measure the spelling that was always right, so a regression that broke it
	instead of fixing the other would be caught rather than looking like
	agreement."

	self assertMatchesCPythonAt: 'binary_reflected_proxy'.
	self assertMatchesCPythonAt: 'binary_reflected_custom'.
%

category: 'Grail-Tests - Controls'
method: AugmentedAssignmentTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '32 checks, 0 disagreeing [], keys match: True'
%
