! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PropertyAndIsinstanceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PropertyAndIsinstanceTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
PropertyAndIsinstanceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PropertyAndIsinstanceTestCase — four roots found greening CPython's
! test_isinstance, only the last about isinstance itself:
!
!   1. ``property(fget)'' -- the CALL form -- was an identity stub returning the
!      function, so such an attribute read gave back the function instead of
!      calling it.  Only ``@property'' worked, by a different route (the
!      decorated def compiles to a real getter METHOD).  The stub was also
!      1-argument only, so the other arities already built a PropertyDescriptor
!      -- which had no __get__ either.
!   2. A class body declaring ``__class__'' was ignored: ___pyAttrLoad___ took a
!      fast path to the built-in __class__ for every object.  CPython lets a user
!      __class__ override it, and the legacy abstract-class protocol needs that.
!   3. isinstance/issubclass rejected PEP 604 unions, and their nested-tuple
!      recursion had no depth guard -- a deeply nested classinfo died on an
!      uncatchable AlmostOutOfStack instead of RecursionError.
!   4. When the real-type check FAILED, CPython still consults ``inst.__class__'',
!      so a lying __class__ is honoured and a raising one propagates.
!
! Fixture: tests/python/property_and_isinstance_protocol.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PropertyAndIsinstanceTestCase removeAllMethods.
PropertyAndIsinstanceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
results
	"Load tests/python/property_and_isinstance_protocol.py fresh."

	| mod |
	importlib @env1:modules removeKey: #'property_and_isinstance_protocol' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/property_and_isinstance_protocol.py')
		name: 'property_and_isinstance_protocol'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
assertResult: aKey equals: expected
	self assert: (self results @env1:__getitem__: aKey) equals: expected
%

! --- 1. property() call form ---------------------------------------------------

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testCallFormPropertyRunsItsGetter
	"``val = property(getval)'' used to read back the FUNCTION."

	self assertResult: 'call_form_read' equals: '''called'''.
	self assertResult: 'two_arg_read' equals: '''two-get'''
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testDecoratorFormStillWorks
	"@property takes a different route entirely (a compiled getter method), so
	it must be unaffected."

	self assertResult: 'decorator_still_works' equals: '''decorated'''
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testEveryArityBuildsTheSameKindOfDescriptor
	"The 1-argument form was the odd one out: it answered a bare function while
	property(), property(g, s), property(g, s, doc=) all built descriptors."

	self assertResult: 'one_arg_type' equals: '''PropertyDescriptor'''.
	self assertResult: 'two_arg_type' equals: '''PropertyDescriptor'''.
	self assertResult: 'no_arg_type' equals: '''PropertyDescriptor'''.
	self assertResult: 'kwarg_type' equals: '''PropertyDescriptor'''
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testClassAccessAnswersTheDescriptorItself
	"CPython's property.__get__(None, owner) is the property, which is what
	makes ``C.prop.fget'' work."

	self assertResult: 'class_access_is_descriptor' equals: '''PropertyDescriptor'''.
	self assertResult: 'fget_reachable' equals: 'True'
%

! --- 2. a declared __class__ wins ---------------------------------------------

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testDeclaredClassAttributeOverridesBuiltinClass
	self assertResult: 'declared_class_wins' equals: '''int'''
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testOrdinaryReceiversKeepTheBuiltinClass
	"The gate must be narrow: a plain user class and every kernel-backed type
	(which define their OWN env-1 __class__) keep the fast path."

	self assertResult: 'plain_class_unaffected' equals: '''Plain'''.
	self assertResult: 'builtin_class_unaffected' equals: '''int'''.
	self assertResult: 'dict_class_unaffected' equals: '''dict'''.
	self assertResult: 'str_class_unaffected' equals: '''str'''
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testDocIsNotGatedTheSameWay
	"ClassDefAst gives EVERY class a __doc__ accessor, so gating __doc__ on the
	same test would skip the fast path for every object."

	self assertResult: 'doc_still_reads' equals: 'True'
%

! --- 3. unions and the nested-tuple depth guard -------------------------------

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testIsinstanceAcceptsPep604Unions
	self assertResult: 'isinstance_union_hit' equals: 'True'.
	self assertResult: 'isinstance_union_miss' equals: 'False'.
	self assertResult: 'isinstance_union_class' equals: 'True'
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testUnionNormalizesNoneToNoneType
	"``int | None'' keeps the None SINGLETON in __args__ while CPython stores
	NoneType, so the member needs translating at the point of use."

	self assertResult: 'isinstance_union_none' equals: 'True'
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testIssubclassAcceptsPep604Unions
	self assertResult: 'issubclass_union_hit' equals: 'True'.
	self assertResult: 'issubclass_union_miss' equals: 'False'
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testUnionMembersAreStillValidated
	"Per-member checking must keep CPython's TypeErrors: a non-class first
	argument, and a parameterised generic as classinfo."

	self
		assertResult: 'issubclass_union_bad_arg1'
		equals: 'TypeError: issubclass() arg 1 must be a class'.
	self
		assertResult: 'issubclass_union_generic_alias'
		equals: 'TypeError: issubclass() arg 2 must be a class, a tuple of classes, or a union'.
	self
		assertResult: 'isinstance_generic_alias_rejected'
		equals: 'TypeError: isinstance() arg 2 must be a type, a tuple of types, or a union'
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testTypingContainerAliasesAreTheBuiltins
	"typing.List has been a deprecated alias of list since 3.9; as a bare stub
	instance it was not a type at all, so ``typing.List | typing.Tuple'' raised
	``unsupported operand type(s) for |''."

	self assertResult: 'typing_list_is_list' equals: 'True'.
	self assertResult: 'typing_union_subclass' equals: 'True'.
	self assertResult: 'typing_union_miss' equals: 'False'.
	self assertResult: 'typing_subscript' equals: '''list[int]'''
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testNestedTupleClassinfoStillWorksButIsBounded
	"A flat or singly-nested classinfo tuple is ordinary CPython usage; an
	absurd nesting must be a CATCHABLE RecursionError rather than the
	uncatchable Smalltalk AlmostOutOfStack it used to be."

	self assertResult: 'flat_tuple_classinfo' equals: 'True'.
	self assertResult: 'nested_tuple_classinfo' equals: 'True'.
	self
		assertResult: 'deep_nested_tuple_raises'
		equals: 'RecursionError: maximum recursion depth exceeded in __instancecheck__'
%

! --- 4. isinstance consults a declared __class__ ------------------------------

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testLyingClassIsHonouredByIsinstance
	"CPython's object_isinstance re-tests against ``inst.__class__'' after the
	real type check fails, so an object is judged by what it CLAIMS to be."

	self assertResult: 'lying_class_makes_isinstance_true' equals: 'True'
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testRaisingClassGetterIsNotMasked
	"Both code paths: a real type as classinfo (bool) and a user class."

	self assertResult: 'raising_class_propagates' equals: 'RuntimeError: boom'.
	self assertResult: 'raising_class_propagates_userclass' equals: 'RuntimeError: boom'
%

category: 'Grail-Tests-PropertyIsinstance'
method: PropertyAndIsinstanceTestCase
testLegacyAbstractClassProtocolEndToEnd
	"The whole shape test_isinstance is built on: __bases__ and __class__ both
	exposed as call-form properties on plain objects that are not types."

	self assertResult: 'abstract_self' equals: 'True'.
	self assertResult: 'abstract_child_of_super' equals: 'True'.
	self assertResult: 'abstract_super_not_child' equals: 'False'.
	self assertResult: 'abstract_vs_normal' equals: 'False'.
	self assertResult: 'normal_vs_abstract' equals: 'False'.
	self assertResult: 'abstract_issubclass' equals: 'True'
%
