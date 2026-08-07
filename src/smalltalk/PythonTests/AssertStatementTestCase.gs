! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AssertStatementTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AssertStatementTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AssertStatementTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AssertStatementTestCase - the `assert` statement's codegen
! ===============================================================================
! Guards AssertAst>>printSmalltalkOn:.  A constant condition (`assert 0`)
! used to break COMPILATION of the whole enclosing method, and a
! non-Boolean condition was a runtime doesNotUnderstand rather than a
! truthiness test.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AssertStatementTestCase removeAllMethods.
AssertStatementTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - assert'
method: AssertStatementTestCase
testAssertStatement
	"The `assert` statement: constant conditions, truthiness, and the
	failure message.

	A CONSTANT condition is the headline case.  ``assert 0'' / ``assert 1''
	is CPython's idiom for an unreachable branch, and the old codegen
	emitted a bare ``0 ifFalse: [...]''.  GemStone inlines ifFalse: when
	its argument is a literal block and then statically requires a Boolean
	receiver, so that did not merely misbehave at runtime -- the whole
	enclosing METHOD failed to compile, and every test in it reported
	``Grail could not compile this method''.  That is what took out
	datetimetester's test_utc_offset_out_of_bounds, whose type dispatch
	ends in ``else: assert 0, 'impossible'''.

	Python's assert also tests TRUTHINESS rather than identity with True,
	so the fixture walks the falsy/truthy values (including __bool__ and
	__len__ driven ones); a bare ifFalse: on those was a runtime
	doesNotUnderstand.

	Finally the failure message: it was signalled with Smalltalk's
	``signal:'' at env 0, which sets the Smalltalk messageText but not the
	Python exception's args, so ``str(e)'' came back empty."

	| mod results |
	importlib @env1:modules removeKey: #'assert_statement' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/assert_statement.py')
		name: 'assert_statement'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('const_true_passes' 'const_false_raises'
	  'const_false_msg_carries_text' 'unreachable_else_compiles'
	  'falsy_empty_list' 'truthy_list' 'falsy_empty_str' 'truthy_str'
	  'falsy_zero' 'falsy_zero_float' 'truthy_float' 'falsy_none'
	  'falsy_empty_dict' 'truthy_dict' 'falsy_empty_tuple'
	  'truthy_tuple_of_zero' 'falsy_False' 'truthy_True'
	  'falsy_via_dunder_bool' 'falsy_via_dunder_len' 'truthy_via_dunder_len'
	  'passing_assert_with_msg' 'msg_not_evaluated_when_passing') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
