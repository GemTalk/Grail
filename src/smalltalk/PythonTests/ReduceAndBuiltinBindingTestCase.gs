! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReduceAndBuiltinBindingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReduceAndBuiltinBindingTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReduceAndBuiltinBindingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReduceAndBuiltinBindingTestCase
!
! Three related fixes, found together because the first one hid the others.
!
!  * A BUILT-IN function stored as a class attribute must not bind self.
!    CPython binds a plain Python function found in a class dict and does not
!    bind a builtin one -- a C function is not a descriptor.  Grail spells both
!    as a BoundMethod on a module instance and bound them alike, so
!    ``self.cmp_to_key(cmp1)'' passed the INSTANCE as the comparison function.
!    The module is the discriminator: one implemented in Smalltalk and filed in
!    has no ``__file__''; one compiled from Python source does.
!
!  * reduce() over an empty iterable with no initial value raised the
!    StopIteration that escaped from its first __next__, where CPython raises
!    TypeError.  ``initial'' could not be passed as a keyword, and wrong
!    argument counts were whatever the arity dispatch happened to produce.
!
!  * cmp_to_key rejected too FEW arguments but accepted too many, silently
!    ignoring everything past the first.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReduceAndBuiltinBindingTestCase removeAllMethods.
ReduceAndBuiltinBindingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ReduceAndBuiltinBindingTestCase
setUp
	"Reload tests/python/reduce_and_builtin_binding.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'reduce_and_builtin_binding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/reduce_and_builtin_binding.py')
		name: 'reduce_and_builtin_binding'.
%

! --- reduce ---

category: 'Grail-Tests - reduce'
method: ReduceAndBuiltinBindingTestCase
testReduceFolds

	self assert: testModule @env1:reduce_basic asArray
		equals: #( 'abc' 6 42 5040 ).
%

category: 'Grail-Tests - reduce'
method: ReduceAndBuiltinBindingTestCase
testReduceOfAnEmptyIterableWithNoInitialValueIsATypeError
	"Not StopIteration -- that escaped from the unguarded first __next__ and
	is not an exception a caller of reduce() can act on."

	self assert: testModule @env1:reduce_empty_without_initial
		equals: 'TypeError'.
%

category: 'Grail-Tests - reduce'
method: ReduceAndBuiltinBindingTestCase
testReduceOverOneItemNeverCallsTheFunction
	"``reduce(42, '1')'' answers '1'.  42 is not callable, which is the point."

	self assert: testModule @env1:reduce_single_item_never_calls_the_function
		equals: '1'.
%

category: 'Grail-Tests - reduce'
method: ReduceAndBuiltinBindingTestCase
testReduceAcceptsInitialAsAKeyword

	self assert: testModule @env1:reduce_initial_as_keyword equals: 'ab'.
%

category: 'Grail-Tests - reduce'
method: ReduceAndBuiltinBindingTestCase
testReduceRejectsWrongArgumentCounts
	"Zero, one, and four arguments are all TypeErrors."

	self assert: testModule @env1:reduce_argument_count_errors asArray
		equals: #( 'TypeError' 'TypeError' 'TypeError' ).
%

category: 'Grail-Tests - reduce'
method: ReduceAndBuiltinBindingTestCase
testReduceRejectsANonIterable

	self assert: testModule @env1:reduce_rejects_a_non_iterable
		equals: 'TypeError'.
%

category: 'Grail-Tests - reduce'
method: ReduceAndBuiltinBindingTestCase
testReducePropagatesAnErrorRaisedByIter
	"An exception from __iter__ belongs to the caller; reduce must not convert
	it into an argument error."

	self assert: testModule @env1:reduce_propagates_an_iteration_error
		equals: 'RuntimeError'.
%

! --- cmp_to_key arity ---

category: 'Grail-Tests - cmp_to_key'
method: ReduceAndBuiltinBindingTestCase
testCmpToKeyRejectsWrongArgumentCounts
	"Factory and key, too few and too many.  Too many used to be accepted,
	silently ignoring everything past the first argument."

	self assert: testModule @env1:cmp_to_key_argument_count_errors asArray
		equals: #( 'TypeError' 'TypeError' 'TypeError' 'TypeError' ).
%

! --- class-attribute binding ---

category: 'Grail-Tests - Builtin binding'
method: ReduceAndBuiltinBindingTestCase
testBuiltinStoredAsAClassAttributeDoesNotBindSelf
	"Bound, the wrapped ``mycmp'' became the instance and every comparison
	tried to call it."

	self assert: testModule @env1:builtin_class_attribute_does_not_bind asArray
		equals: #( true true true ).
%

category: 'Grail-Tests - Builtin binding'
method: ReduceAndBuiltinBindingTestCase
testBuiltinReadThroughTheClassStillWorks
	"The class-side read was always correct; keep it that way, since the
	asymmetry between the two is what made the instance-side bug hard to see."

	self assert: testModule @env1:builtin_class_attribute_via_the_class asArray
		equals: #( true true ).
%

category: 'Grail-Tests - Builtin binding'
method: ReduceAndBuiltinBindingTestCase
testPythonFunctionStoredAsAClassAttributeStillBinds
	"The other half of the rule.  A plain Python function IS a descriptor, so
	the narrowing had to be to BUILT-INS specifically -- dropping the binding
	for every BoundMethod would have broken ``Cls.m = some_function''."

	self assert: testModule @env1:python_function_class_attribute_still_binds
		asArray equals: #( 'bound' 7 ).
%
