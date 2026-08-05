! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PosonlyAndReflectedEqTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PosonlyAndReflectedEqTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
PosonlyAndReflectedEqTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PosonlyAndReflectedEqTestCase — three roots found greening CPython's
! test_userdict, none of them specific to UserDict:
!
!   1. POSITIONAL-ONLY parameters (``def f(dict=None, /, **kw)'') were bound by
!      keyword AND left in **kwargs, applying the keyword TWICE.  ``/'' was
!      treated as a parse-time marker only.  TWO emitters needed it -- the
!      closure/module form and the class-body method forwarder.
!   2. ``dict.__eq__(non_dict)'' answered False instead of punting with
!      NotImplemented, so the REFLECTED __eq__ never ran: ``UserDict() == {}''
!      was True while ``{} == UserDict()'' was False.  list / int / str already
!      punted; dict was the odd one out.
!   3. A function lifted off one class into another class body (``f = Other.f'')
!      stayed UNBOUND, so an instance call raised "unbound method ... must be
!      called with an instance as the first argument".  Functions are
!      descriptors in Python.
!
! Fixture: tests/python/posonly_and_reflected_eq.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PosonlyAndReflectedEqTestCase removeAllMethods.
PosonlyAndReflectedEqTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
results
	"Load tests/python/posonly_and_reflected_eq.py fresh and answer RESULTS."

	| mod |
	importlib @env1:modules removeKey: #'posonly_and_reflected_eq' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/posonly_and_reflected_eq.py')
		name: 'posonly_and_reflected_eq'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
assertResult: aKey equals: expected
	self assert: (self results @env1:__getitem__: aKey) equals: expected
%

! --- 1. positional-only parameters -------------------------------------------

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testKeywordMatchingPosonlyParamGoesOnlyToKwargs
	"``def f(dict=None, /, **kw)'' called f(dict=42): the parameter keeps its
	DEFAULT and the keyword lands in **kw.  It used to do both."

	self assertResult: 'fn_kw_matching_posonly' equals: '(None, {''dict'': 42})'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testPosonlyParamStillBindsPositionally
	self assertResult: 'fn_positional' equals: '({''x'': 1}, {})'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testPositionalAndSameNamedKeywordCoexist
	"f({'x': 1}, dict=42) — the positional binds the parameter, the keyword is
	a separate **kw entry.  Legal precisely because ``/'' fences the name off."

	self assertResult: 'fn_both' equals: '({''x'': 1}, {''dict'': 42})'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testPosonlyOnAMethodMatchesAFunction
	"The class-body method form has its OWN varargs forwarder; fixing only the
	closure/module emitter left methods still double-applying."

	self assertResult: 'method_kw_matching_posonly' equals: '(None, {''dict'': 42})'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testPosonlyMethodPositionalAndBoth
	self assertResult: 'method_positional' equals: '({''x'': 1}, {})'.
	self assertResult: 'method_both' equals: '({''x'': 1}, {''dict'': 42})'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testSelfIsUsableAsAKeywordDataName
	"``self'' sits before ``/'' too, so C(self=42) is legal and must not touch
	the receiver."

	self assertResult: 'method_self_as_key' equals: '(None, {''self'': 42})'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testNonDunderMethodPosonly
	self assertResult: 'plain_method_kw' equals: '(None, {''a'': 1})'.
	self assertResult: 'plain_method_positional' equals: '(5, {})'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testWithoutTheSlashTheParamIsStillKeywordBindable
	"The whole change is gated on the ``/'' marker — a def without one keeps
	binding the keyword to the parameter."

	self assertResult: 'no_slash_still_binds' equals: '(42, {})'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testUserDictTakesParameterNamesAsDataKeys
	"The concrete motivating case: every name is a legal dict key, which is why
	upstream declares UserDict's parameters positional-only."

	self assertResult: 'userdict_dict_key' equals: '[(''dict'', [(''one'', 1)])]'.
	self assertResult: 'userdict_self_key' equals: '[(''self'', 42)]'.
	self assertResult: 'userdict_update_self_key' equals: '[(''self'', 42)]'
%

! --- 2. dict punts so the reflected __eq__ runs -------------------------------

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testDictComparesEqualToAMappingFromTheLeft
	"``{} == UserDict()'' was False while the reverse was True — dict.__eq__
	settled it as false instead of punting, so the reflected __eq__ never ran."

	self assertResult: 'dict_eq_userdict' equals: 'True'.
	self assertResult: 'userdict_eq_dict' equals: 'True'.
	self assertResult: 'dict_ne_userdict' equals: 'False'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testDictComparesAgainstAnyClassDefiningEq
	"Not UserDict-specific: a plain class with __eq__ was equally unreachable
	from the right of a dict."

	self assertResult: 'dict_eq_plain_class' equals: 'True'.
	self assertResult: 'plain_class_eq_dict' equals: 'True'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testTheDunderItselfPunts
	"``d.__eq__(non_dict)'' must NOT be False — the operator layer needs a punt
	to try the reflected side.  This is the assertion that would catch a
	well-meaning revert to ``^ false''."

	self assertResult: 'dunder_punts' equals: 'True'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testOrdinaryDictComparisonIsUnaffected
	"dict-to-dict equality, and a dict against something with no __eq__ of its
	own, must be unchanged — the punt has to land on identity, not leak the
	NotImplemented marker into a boolean."

	self assertResult: 'dict_eq_dict_still_true' equals: 'True'.
	self assertResult: 'dict_eq_dict_still_false' equals: 'False'.
	self assertResult: 'dict_ne_dict_still_true' equals: 'True'.
	self assertResult: 'dict_eq_unrelated_is_false' equals: 'False'.
	self assertResult: 'dict_ne_unrelated_is_true' equals: 'True'
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testUserDictSupportsPep584Union
	"``|'' / ``|='' added to UserDict at the same time; the left operand's class
	wins, and ``dict | UserDict'' reaches UserDict.__ror__."

	self assertResult: 'userdict_or_userdict' equals: '{0: ''a'', 1: ''b''}'.
	self assertResult: 'dict_or_userdict_type' equals: '''UserDict'''.
	self assertResult: 'userdict_ior' equals: '({0: ''a'', 1: ''b''}, ''UserDict'')'
%

! --- 3. a lifted function binds on instance access ---------------------------

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testFunctionLiftedFromAnotherClassBindsOnInstanceAccess
	"``describe_copy = Donor.describe'' in a class body — the shape
	test_userdict uses verbatim.  Reading it through an instance must bind."

	self
		assertResult: 'lifted_method_binds'
		equals: '''donor-method on Recipient'''
%

category: 'Grail-Tests-Posonly'
method: PosonlyAndReflectedEqTestCase
testClassAccessStaysUnbound
	"CPython's ``function.__get__(None, owner) is function'': reading it off the
	CLASS must NOT bind, or the right-hand side of that very assignment would
	capture the class as self."

	self
		assertResult: 'class_access_stays_unbound'
		equals: '''donor-method on Recipient'''.
	self
		assertResult: 'normal_inherited_still_works'
		equals: '''donor-method on Recipient'''
%
