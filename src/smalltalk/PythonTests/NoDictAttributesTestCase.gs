! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NoDictAttributesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NoDictAttributesTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NoDictAttributesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NoDictAttributesTestCase
!
! Objects that cannot hold attributes, and the three types that have exactly
! one instance.
!
! CPython gives a built-in instance no ``__dict__'', so ``x.attr = 1'' raises
! AttributeError -- with a message that says WHY (``and no __dict__ for setting
! new attributes'') rather than the plain ``has no attribute'' a misspelled READ
! gets.  The two wordings are not decoration: from an ASSIGNMENT the short form
! sends the reader looking for a typo, when no spelling would have worked.
!
! Grail answered this THREE ways, decided by how GemStone happened to store the
! receiver rather than by anything about the Python type:
!
!   (1).zz = 1     ImproperOperation 2484 -- a SPECIAL object has no object body
!                  to hang a dynamic instVar on
!   'ab'.zz = 1    ArgumentTypeError 2031 -- an INVARIANT object may not be
!                  written
!   None.zz = 1    ACCEPTED, silently, and readable for the rest of the session
!
! The first two are UNCATCHABLE Smalltalk errors.  ``except AttributeError'' did
! not see them and neither did ``except Exception'', so a Python program could
! not defend against them or detect them; inside a test shard they take the
! SHARD rather than the test.  The third is worse in the way a wrong answer is
! worse than an error -- a mistyped assignment to None looked like it worked,
! and ``None.zz'' then answered 1 for the rest of the session.  (Nothing is
! committed, so it stops at the session boundary.)
!
! Two more members of the same family are pinned here because one fix cannot be
! trusted to have reached them:
!
!   * KEYWORD ARGUMENTS to a built-in class that takes none.  The generic
!     instantiation path forwarded to ``_new:kw:'' unconditionally although its
!     own documented dispatch order says ``if implemented'', so
!     ``frozenset(zz=1)'', ``slice(zz=1)'' and ``object(zz=1)'' performed a
!     selector nobody defines and raised an uncatchable MessageNotUnderstood.
!     tuple, which does implement it, answered the right TypeError all along --
!     so the two halves of one protocol disagreed and only one was ever tested.
!
!   * THE TYPE NAME in all of these messages.  Grail printed the Smalltalk class
!     that happens to back a built-in, so an int read 'SmallInteger' and a str
!     'Unicode7'.  The built-ins whose two names coincide (tuple, frozenset,
!     NoneType) hid it, which is why it survived: whether the message was
!     intelligible depended on which type you picked.  NoneType is kept here as
!     the control that a regression reverting the mapping still passes.
!
! The last test is the control in the other direction.  This change CONVERTS a
! failure; it must not create one.  A fix that refused every store would satisfy
! every test above.
!
! ONE DOCUMENTED DIVERGENCE, and it is deliberate.  Names beginning ``___''
! are Grail's own bookkeeping namespace, not Python attributes, and they are
! still accepted on a singleton -- ClassDefAst stores a closure cell
! ``___cell_<name>___'' onto whatever a class name currently holds, which is
! None for a classdef whose name is not yet bound, and refusing that broke the
! closure-cell machinery outright (all five of
! DunderClassInjectedCellTestCase's tests).  So ``None.___x___ = 1'' is
! accepted where CPython refuses.  That test case is the guard for the
! carve-out; nothing here asserts it, because a Python program never writes
! such a name and pinning it would read as though the divergence were wanted
! rather than tolerated.
!
! Drives tests/python/no_dict_attributes.py, whose EXPECTED table was measured
! by RUNNING CPython 3.14.6, so a disagreement is Grail differing from CPython
! rather than from a guess.
!
! test_builtin's test_construct_singletons and test_singleton_attribute_access.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NoDictAttributesTestCase removeAllMethods.
NoDictAttributesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NoDictAttributesTestCase
setUp
	"Reload tests/python/no_dict_attributes.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'no_dict_attributes' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/no_dict_attributes.py')
		name: 'no_dict_attributes'.
%

category: 'Grail-Private'
method: NoDictAttributesTestCase
assertMatchesCPythonAt: key
	"Compare the fixture's measured value against its own EXPECTED entry --
	CPython 3.14.6's actual output for the same probe."

	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - No instance dictionary'
method: NoDictAttributesTestCase
testAStoreOntoAnObjectWithNoInstanceDictRaisesAttributeError
	"Seven built-ins spanning GemStone's TWO refusals: int, float and bool are
	special objects, str, bytes, tuple and frozenset are invariant ones.  Both
	arrive as uncatchable Smalltalk errors and both must become the same
	AttributeError, because from Python the two are indistinguishable -- a fix
	that converts one leaves half of these still able to kill a shard."

	self assertMatchesCPythonAt: 'store_int'.
	self assertMatchesCPythonAt: 'store_float'.
	self assertMatchesCPythonAt: 'store_bool'.
	self assertMatchesCPythonAt: 'store_str'.
	self assertMatchesCPythonAt: 'store_bytes'.
	self assertMatchesCPythonAt: 'store_tuple'.
	self assertMatchesCPythonAt: 'store_frozenset'.
%

category: 'Grail-Tests - No instance dictionary'
method: NoDictAttributesTestCase
testTheRefusalCarriesTheAttributeName
	"``e.name'' is what traceback.py's ``Did you mean:'' machinery matches on,
	and the stdlib reads it directly (``except AttributeError as e: if e.name
	== ...'').  A refusal that carries no name is one the stdlib cannot work
	with, so raising the right CLASS is not on its own enough."

	self assertMatchesCPythonAt: 'store_carries_name'.
%

category: 'Grail-Tests - No instance dictionary'
method: NoDictAttributesTestCase
testAMissingAttributeReadKeepsTheShorterMessage
	"The READ form has no ``and no __dict__'' suffix, and keeping the two
	apart is the point of having two entry points: the suffix is what tells a
	reader that no spelling of the assignment would have worked."

	self assertMatchesCPythonAt: 'read_int'.
	self assertMatchesCPythonAt: 'read_float'.
	self assertMatchesCPythonAt: 'read_bool'.
	self assertMatchesCPythonAt: 'read_str'.
	self assertMatchesCPythonAt: 'read_bytes'.
%

category: 'Grail-Tests - Singletons'
method: NoDictAttributesTestCase
testTheSingletonTypesAnswerTheirOneInstance
	"``type(x)()'' is how generic code reconstructs a value it was handed, and
	NoneType was the only one of the three that refused it.

	Answering a FRESH instance would be worse than either: a second None
	answers the same __repr__, so nothing but ``is'' can see the difference and
	every ``x is None'' test in the program quietly stops matching.  Hence the
	identity check rather than a repr comparison."

	self assertMatchesCPythonAt: 'call_None'.
	self assertMatchesCPythonAt: 'call_Ellipsis'.
	self assertMatchesCPythonAt: 'call_NotImplemented'.
%

category: 'Grail-Tests - Singletons'
method: NoDictAttributesTestCase
testTheSingletonTypesStillRefuseArguments
	"Answering the instance must not make the constructor permissive.  The
	KEYWORD form is a separate path from the positional one and was an
	uncatchable MessageNotUnderstood, so it is asserted separately rather than
	assumed to follow."

	self assertMatchesCPythonAt: 'call_args_None'.
	self assertMatchesCPythonAt: 'call_args_Ellipsis'.
	self assertMatchesCPythonAt: 'call_args_NotImplemented'.
	self assertMatchesCPythonAt: 'call_kwargs_None'.
	self assertMatchesCPythonAt: 'call_kwargs_Ellipsis'.
	self assertMatchesCPythonAt: 'call_kwargs_NotImplemented'.
%

category: 'Grail-Tests - Singletons'
method: NoDictAttributesTestCase
testTheSingletonsHoldNoAttributesOnInstanceOrClass
	"Four refusals per singleton, and they are not the same refusal: an
	instance store and read raise AttributeError, while a CLASS store raises
	TypeError -- CPython distinguishes ``this object has no such attribute'',
	which invites a getattr() fallback, from ``this TYPE takes no attributes'',
	which no retry can fix.  A single error class for both cannot satisfy
	test_singleton_attribute_access, which asserts one of each."

	#('None' 'Ellipsis' 'NotImplemented') do: [:nm |
		self assertMatchesCPythonAt: 'singleton_set_' , nm.
		self assertMatchesCPythonAt: 'singleton_get_' , nm.
		self assertMatchesCPythonAt: 'singleton_class_set_' , nm.
		self assertMatchesCPythonAt: 'singleton_class_get_' , nm]
%

category: 'Grail-Tests - Keyword arguments'
method: NoDictAttributesTestCase
testKeywordArgumentsToABuiltinThatTakesNoneRaiseTypeError
	"Not singleton-specific: every built-in class without a ``_new:kw:'' went
	the same way.  tuple is listed last as the positive control -- it HAS one
	and has always raised the right TypeError, so it is the half of the
	protocol that was already correct, and a fix that broke it would otherwise
	go unnoticed here."

	self assertMatchesCPythonAt: 'kwargs_frozenset'.
	self assertMatchesCPythonAt: 'kwargs_slice'.
	self assertMatchesCPythonAt: 'kwargs_object'.
	self assertMatchesCPythonAt: 'kwargs_tuple'.
%

category: 'Grail-Tests - Type names'
method: NoDictAttributesTestCase
testTheMessagesNameThePythonTypeNotTheSmalltalkClass
	"int, str and float are the cases where the two names differ (Integer,
	Unicode7, Float).  NoneType is the control whose names coincide: a
	regression that reverted the mapping entirely would still pass that row,
	so it is here to show the other three are doing the work."

	#('int' 'str' 'float' 'NoneType') do: [:nm |
		self assertMatchesCPythonAt: 'class_set_' , nm.
		self assertMatchesCPythonAt: 'class_get_' , nm]
%

category: 'Grail-Tests - Controls'
method: NoDictAttributesTestCase
testObjectsThatDoHoldAttributesAreUntouched
	"THE CONTROL IN THE OTHER DIRECTION.  This change converts a failure into a
	catchable exception; it must not create one.  A fix that simply refused
	every attribute store would pass every test above and fail here -- which is
	the only reason these four rows exist, since nothing about them is
	interesting on its own."

	self assertMatchesCPythonAt: 'user_instance_attr'.
	self assertMatchesCPythonAt: 'user_class_attr'.
	self assertMatchesCPythonAt: 'exception_attr'.
	self assertMatchesCPythonAt: 'function_attr'.
%

category: 'Grail-Tests - Controls'
method: NoDictAttributesTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a check that is DELETED stops being
	asserted and nothing goes red.  This one reads the fixture's own roll-up,
	which carries the check count, the names of any that disagree, and whether
	the measured keys still match the expected ones -- so adding a probe
	without a measured expectation, or removing one, moves this string."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '50 checks, 0 disagreeing [], keys match: True'
%
