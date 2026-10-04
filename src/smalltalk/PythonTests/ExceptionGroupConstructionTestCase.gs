! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ExceptionGroupConstructionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ExceptionGroupConstructionTestCase comment:
'BaseExceptionGroup construction, fields, split/subgroup and generic alias, as
CPython 3.14 test_exception_group drives them.

The module scored 23 failures and 1 error.  Construction validated nothing;
message and exceptions were re-read from args, so they could be assigned and
followed a mutated argument list; split/subgroup tested only leaves, accepted
any condition, and dropped the original traceback, chaining and notes from
the parts; ExceptionGroup[T] was the class itself; and a group mixed with
ValueError took ValueError as its Smalltalk superclass and had no exceptions
at all (importlib >> ___exceptionLayoutBase___:).

Every expectation in tests/python/exception_group_construction.py was
produced by CPython 3.14; the fixture gate re-checks it there.'
%

doit
ExceptionGroupConstructionTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ExceptionGroupConstructionTestCase removeAllMethods: 0.
ExceptionGroupConstructionTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExceptionGroupConstructionTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exception_group_construction' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_group_construction.py')
		name: 'exception_group_construction'.
%

category: 'Grail-Helpers'
method: ExceptionGroupConstructionTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ExceptionGroupConstructionTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ExceptionGroupConstructionTestCase
testConstructorValidatesItsArguments
	"Arity, a str message, a non-empty sequence of exception INSTANCES."

	self assertAll: #('bad_constructor_arguments')
%

category: 'Grail-Tests'
method: ExceptionGroupConstructionTestCase
testWhichClassIsBuilt
	"PEP 654 narrowing, and a group class that is an Exception refusing to
	hold a KeyboardInterrupt -- a subclass names itself in the message."

	self assertAll: #('which_class_is_built' 'a_subclass_new_takes_its_own_arguments')
%

category: 'Grail-Tests'
method: ExceptionGroupConstructionTestCase
testAMixedBaseGroupIsARealGroup
	"``class MixedEG(BaseExceptionGroup, ValueError)'' extends the group's
	layout and is still caught as a ValueError."

	self assertAll: #('a_mixed_base_group_is_a_real_group')
%

category: 'Grail-Tests'
method: ExceptionGroupConstructionTestCase
testFieldsAndRepr
	"message/exceptions are read-only snapshots; repr keeps the shape of the
	argument and is taken at construction."

	self assertAll: #('fields_are_readonly_snapshots' 'repr_keeps_the_argument_shape'
		'a_broken_repr_fails_construction')
%

category: 'Grail-Tests'
method: ExceptionGroupConstructionTestCase
testSplitAndSubgroup
	"The node is tested before its children; bad conditions are refused; the
	parts carry the original's state; derive must answer a group."

	self assertAll: #('a_matching_group_is_answered_itself' 'a_bad_condition_is_refused'
		'parts_carry_the_original_state' 'non_sequence_notes_are_not_copied'
		'derive_must_answer_a_group')
%

category: 'Grail-Tests'
method: ExceptionGroupConstructionTestCase
testGenericsAndExceptStar
	"Only the group classes are generic; except* on a naked exception binds a
	wrapper built from a tuple and passes the exception on when unmatched."

	self assertAll: #('only_the_groups_are_generic' 'except_star_on_a_naked_exception')
%

category: 'Grail-Tests'
method: ExceptionGroupConstructionTestCase
testDeepNestingIsARecursionError
	"A DELIBERATE DIVERGENCE, pinned here rather than in the CPython-compared
	fixture: Grail bounds split/subgroup at sys.getrecursionlimit() (1000),
	CPython 3.14 at its C stack (somewhere past 50,000).  1100 is the depth
	Grail's vendored test.support gives test_exception_group's
	DeepRecursionInSplitAndSubgroup; both walks must refuse it.  See
	BaseExceptionGroup >> ___splitNode___:kind:condition:constructRest:depth:."

	| outcome |
	outcome := (testModule @env1:___pyAttrLoad___: #deep_split_outcome)
		@env1:value: { 1100 } value: nil.
	self assert: (outcome @env1:__getitem__: 0) = 'RecursionError'.
	self assert: (outcome @env1:__getitem__: 1) = 'RecursionError'
%
