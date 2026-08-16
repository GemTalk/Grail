! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PrintOutputRoutingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PrintOutputRoutingTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PrintOutputRoutingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PrintOutputRoutingTestCase
!
! print()'s keywords, and where it writes.
!
! ``_print:kw:'' accepted sep/end/file/flush and DROPPED all four, and its
! separator was wrong even without them: a space went AFTER each object rather
! than BETWEEN them, so ``print('a', 'b')'' produced ``a b '' with a trailing
! space and there was no way to suppress the newline.
!
! WHERE IT WRITES is the half with reach.  The target is the ``file'' argument,
! or ``sys.stdout'' when there is none -- read at CALL TIME, which is what makes
! redirection work at all:
!
!     sys.stdout = io.StringIO()      -- test.support.captured_stdout()
!     print('123')                    -- lands in the StringIO
!
! Two details decided that half:
!
!   * the lookup is ___pyAttrLoad___, not a ``stdout'' accessor send.  An
!     assignment ``sys.stdout = buf'' lands in the module instance's DYNAMIC
!     store while the compiled accessor keeps answering the None it was built
!     with and SHADOWS it -- so the accessor reports that no redirection ever
!     happened.  ___pyAttrLoad___ is the path a Python-level read already takes.
!   * Grail's sys.stdout is None, meaning the console, so an ordinary print
!     still reaches the Transcript exactly as before.  Only a non-None target is
!     written through, and only via ``write''.
!
! Errors are CPython's, and both were previously impossible to catch: a bad
! sep/end type is a TypeError naming the keyword, and a ``file'' with no write()
! is an AttributeError rather than an uncatchable MessageNotUnderstood.  An
! exception from flush() is deliberately NOT guarded -- swallowing it turns a
! reported failure into a silent one.
!
! test.test_print goes FAIL/2 to OK/0, completing the module.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/print_output_routing.py under it directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PrintOutputRoutingTestCase removeAllMethods.
PrintOutputRoutingTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: PrintOutputRoutingTestCase
setUp
	"Reload tests/python/print_output_routing.py fresh each test -- one fixture
	reassigns sys.stdout and restores it."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'print_output_routing' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/print_output_routing.py')
		name: 'print_output_routing'.
%

category: 'Grail-Tests'
method: PrintOutputRoutingTestCase
testSeparatorIsBetweenNotAfter
	"THE BUG.  A trailing separator after the last object is not CPython's
	output -- and nothing could observe it while ``file'' was ignored too."

	self assert: testModule @env1:separator_is_between_not_after asArray
		equals: #( 'a b
' '1*2*3
' 'a
' ).
%

category: 'Grail-Tests'
method: PrintOutputRoutingTestCase
testEndReplacesTheNewline
	"``end'' replaces the trailing newline rather than adding to it."

	self assert: testModule @env1:end_replaces_the_newline asArray
		equals: #( 'a' 'a+' '1*a*1.3+' ).
%

category: 'Grail-Tests'
method: PrintOutputRoutingTestCase
testNoArgumentsPrintsJustTheEnd
	"``print()'' writes the end and nothing else -- with the separator applied
	after each object this still worked, so it pins the empty case explicitly."

	self assert: testModule @env1:no_arguments_prints_just_the_end equals: '
'.
%

category: 'Grail-Tests'
method: PrintOutputRoutingTestCase
testNoneMeansTheDefault
	"``sep=None'' is the same as omitting it, NOT an empty separator."

	self assert: testModule @env1:none_means_the_default asArray
		equals: #( 'a
 b
' 'a
 b
' 'a
 b
' ).
%

category: 'Grail-Tests'
method: PrintOutputRoutingTestCase
testObjectsAreStringified
	"str(), with __repr__ as the fallback -- the two-step the original had, kept."

	self assert: testModule @env1:objects_are_stringified asArray
		equals: #( '*
' 'None
' '* 1
' ).
%

category: 'Grail-Tests'
method: PrintOutputRoutingTestCase
testAReassignedSysStdoutIsHonoured
	"THE OTHER HALF, and test.support.captured_stdout()'s whole mechanism.  The
	accessor send this replaced answered the None sys.stdout was built with and
	shadowed the assignment, so the buffer stayed empty."

	self assert: testModule @env1:a_reassigned_sys_stdout_is_honoured equals: '
123
'.
%

category: 'Grail-Tests'
method: PrintOutputRoutingTestCase
testABadSeparatorTypeIsATypeError
	"CPython's wording, since test_print matches the message text."

	self assert: testModule @env1:a_bad_separator_type_is_a_type_error asArray
		equals: #( 'sep must be None or a string, not int'
			'end must be None or a string, not int' ).
%

category: 'Grail-Tests'
method: PrintOutputRoutingTestCase
testAFileWithoutWriteIsAnAttributeError
	"``file'' only has to provide write().  A bare send produced an
	UNCATCHABLE MessageNotUnderstood, so the assertRaises could never pass."

	self assert: testModule @env1:a_file_without_write_is_an_attribute_error
		equals: 'AttributeError'.
%

category: 'Grail-Tests'
method: PrintOutputRoutingTestCase
testFlushIsCalledWhenAsked
	"Once per truthy flush=, and not otherwise."

	self assert: testModule @env1:flush_is_called_when_asked asArray
		equals: (Array with: '123
' with: 2).
%

category: 'Grail-Tests'
method: PrintOutputRoutingTestCase
testAnExceptionFromFlushPropagates
	"Deliberately NOT guarded: swallowing an error raised by the file's flush
	turns a reported failure into a silent one."

	self assert: testModule @env1:an_exception_from_flush_propagates
		equals: 'RuntimeError'.
%
