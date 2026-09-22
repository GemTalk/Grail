! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StringIOSubclassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StringIOSubclassTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StringIOSubclassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StringIOSubclassTestCase
!
! Subclassing io.StringIO / io.BytesIO did not work AT ALL.
!
! Both build their entire state in ``__new__'' -- the buffer, the position and
! the closed flag -- and have no ``__init__''.  A subclass with no __init__ of
! its own therefore has to be routed to the inherited __new__, exactly as a
! subclass of tuple / frozenset / bytes / bytearray already was; those four
! branches exist in object >> ___call___ for this very reason and io was simply
! not among them.
!
! Without that routing the construction took the generic path, which PREPENDS
! the class as CPython's implicit-staticmethod ``cls'' argument.  Grail's builtin
! ``__new__:'' classmethods take the VALUE and not a cls, so the two conventions
! collide:
!
!     class A(io.StringIO): pass
!     A.__new__(A).getvalue()     -- answered 'A': the CLASS became the buffer
!     A('x').getvalue()           -- answered None: no buffer was set at all
!
! and every method on such an instance then read nil.  ``A('x').readline()''
! died with an uncatchable Smalltalk MessageNotUnderstood -- nil does not
! understand ``>='' -- which no Python ``except'' can see.
!
! THE FAILURE LOOKED LIKE SOMETHING ELSE ENTIRELY, and that is the part worth
! keeping.  test_builtin's test_input_gh130163 subclasses StringIO and gives it
! a __getattribute__ that re-patches sys.stdout, sys.stderr and sys.stdin in the
! middle of a read; the crash was blamed on that interception -- a plausible
! and interesting culprit -- until a PLAIN subclass with no methods at all
! turned out to fail identically.  The fixture keeps both: the plain subclass
! rows say where the fault is, and the gh130163 row says what it broke.
!
! NOT COVERED HERE: CPython's StringIO takes a second ``newline'' argument and
! Grail's takes only the initial value, so a two-argument call means different
! things to the two -- CPython validates the newline, Grail refuses the arity.
! That is a gap in io, not in the construction routing this is about.
!
! Drives tests/python/stringio_subclass.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.
!
! test_builtin's test_input_gh130163.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StringIOSubclassTestCase removeAllMethods.
StringIOSubclassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: StringIOSubclassTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'stringio_subclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stringio_subclass.py')
		name: 'stringio_subclass'.
%

category: 'Grail-Private'
method: StringIOSubclassTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - a plain subclass'
method: StringIOSubclassTestCase
testAPlainSubclassIsConstructed
	"The rows that say where the fault actually was: no __getattribute__, no
	methods at all, and the buffer was never set."

	self assertMatchesCPythonAt: 'str_getvalue'.
	self assertMatchesCPythonAt: 'str_read'.
	self assertMatchesCPythonAt: 'str_readline'.
	self assertMatchesCPythonAt: 'str_empty'.
	self assertMatchesCPythonAt: 'bytes_getvalue'.
	self assertMatchesCPythonAt: 'bytes_empty'.
%

category: 'Grail-Tests - a plain subclass'
method: StringIOSubclassTestCase
testItBehavesLikeTheBase
	"Writing, the closed flag, the type and isinstance -- everything that
	reads the state __new__ was supposed to set."

	self assertMatchesCPythonAt: 'str_write_then_read'.
	self assertMatchesCPythonAt: 'str_closed_flag'.
	self assertMatchesCPythonAt: 'type_is_the_subclass'.
	self assertMatchesCPythonAt: 'isinstance_of_base'.
%

category: 'Grail-Tests - the shape the test uses'
method: StringIOSubclassTestCase
testTheGh130163Shape
	"A subclass with a __getattribute__ that re-patches sys.stdout, stderr
	and stdin in the middle of input()'s read.  It was blamed for the crash;
	it was never the cause."

	self assertMatchesCPythonAt: 'getattribute_subclass'.
	self assertMatchesCPythonAt: 'gh130163'.
%

category: 'Grail-Tests - Controls'
method: StringIOSubclassTestCase
testTheBaseClassesAreUndisturbed
	"The routing is reached only by a SUBCLASS with no __init__ of its own,
	so the base classes and a subclass that does define one must behave
	exactly as before."

	self assertMatchesCPythonAt: 'plain_stringio'.
	self assertMatchesCPythonAt: 'plain_bytesio'.
	self assertMatchesCPythonAt: 'subclass_with_init'.
	self assertMatchesCPythonAt: 'one_argument_is_enough'.
%

category: 'Grail-Tests - Controls'
method: StringIOSubclassTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '16 checks, 0 disagreeing [], keys match: True'
%
