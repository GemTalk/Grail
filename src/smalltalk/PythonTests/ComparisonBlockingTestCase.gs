! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ComparisonBlockingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ComparisonBlockingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ComparisonBlockingTestCase - ``__eq__ = None'' blocks, ordering honours
! subclass priority, and a declined forward dunder reflects exactly once.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ComparisonBlockingTestCase removeAllMethods.
ComparisonBlockingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - comparison'
method: ComparisonBlockingTestCase
testComparisonBlockingAndOrder
	"Three rules from CPython's do_richcompare / slot_tp_richcompare.

	``__eq__ = None'' in a class body does not leave the comparison undefined:
	the lookup SUCCEEDS and yields None, which is then called, so the pair
	raises TypeError.  Falling back to the other operand -- what Grail did --
	answers the very comparison the block exists to refuse, and the idiom is
	written precisely to stop a subclass inheriting a comparison that is wrong
	for it.  Reached from three directions: the forward operand, the reflected
	one, and a blocking SUBCLASS on the right, which subclass priority consults
	first.

	Subclass priority applied to ==/!= but not to ORDERING, so ``B() <= C()''
	with C a subclass of B called B.__le__ before C.__ge__ -- backwards.

	And a forward dunder returning NotImplemented must produce exactly ONE
	reflected call.  A plain ``def __eq__(self, other)'' compiles to both a
	fixed-arity and a varargs selector, and ___eqValue___ tried both, so the
	reflected method ran twice.  ___neValue___ already guarded against this;
	the fix is the same guard."

	| mod results |
	importlib @env1:modules removeKey: #'comparison_blocking' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/comparison_blocking.py')
		name: 'comparison_blocking'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('block_is_visible_as_None' 'plain_eq_still_works'
	  'eq_against_plain_object' 'eq_reflected_against_plain'
	  'left_operand_wins_over_block' 'blocked_forward_raises'
	  'blocked_subclass_raises' 'blocked_subclass_forward_raises'
	  'ne_plain' 'ne_blocked_subclass' 'ne_blocked_subclass_forward'
	  'ne_unblocked_left_wins' 'ne_blocked_forward'
	  'hash_block_still_raises' 'derived_def_outranks_inherited_none'
	  'eq_calls_reflected_once' 'ne_calls_reflected_once'
	  'le_forward_then_reflected' 'eq_subclass_priority'
	  'le_subclass_priority' 'ge_subclass_priority' 'le_subclass_on_left'
	  'unorderable_pair_raises') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
