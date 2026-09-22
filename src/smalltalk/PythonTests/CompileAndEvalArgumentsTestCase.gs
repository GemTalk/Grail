! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CompileAndEvalArgumentsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CompileAndEvalArgumentsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CompileAndEvalArgumentsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CompileAndEvalArgumentsTestCase
!
! What compile(), exec() and eval() ACCEPT, and what they refuse.
!
! Grail took a str and nothing else.  Every other spelling CPython allows came
! back as ``arg 1 must be a string; a code object is metadata only in Grail'' --
! a message about the wrong thing entirely, since a bytes source is not a code
! object and CPython compiles it happily.
!
! A BYTE SOURCE needs three separate things, each its own CPython error: a UTF-8
! BOM is STRIPPED, because Python source may carry one and it is not part of the
! program; bytes that are not UTF-8 are a SyntaxError about the ENCODING, naming
! the first offending byte, which a TRUNCATED BOM is the case that pins; and a
! NUL anywhere is a SyntaxError, in a str source as much as a bytes one -- Grail
! passed it to the tokenizer, which reported an ``Unexpected token'' about a
! character its own message could not print.
!
! ___sourceTextFor___:what: is the single place that decides, so exec(), eval()
! and compile() cannot drift apart on it.  Note its ``on: AbstractException'':
! an object with no ``tobytes'' at all fails with a Smalltalk
! MessageNotUnderstood, which is NOT a Python exception and which
! ``on: Exception'' does not see -- so ``eval(())'' died uncatchably rather than
! raising TypeError, and the first cut of this had exactly that bug.
!
! COMPILE() HAD THREE MORE GAPS, each of which let a wrong call SUCCEED, which
! is the part worth keeping:
!
!   * its six parameters are keyword-able and only positionals were read, so
!     ``compile(source='pass', filename='?', mode='exec')'' raised about a
!     missing argument that was right there;
!   * the MODE was not validated, so ``compile(src, f, 'badmode')'' answered the
!     source unchanged and whatever ran next ran under a mode nothing had agreed
!     to;
!   * the FLAGS were not validated, so 0xff was accepted -- and 0xff is made of
!     CO_ bits, which describe a code OBJECT and are not compiler directives at
!     all.
!
! ONE DIVERGENCE IS RECORDED RATHER THAN FIXED.  Grail's SyntaxError inherits
! BaseException's __str__, which prints the args tuple where CPython formats
! ``msg (<file>, line N)''.  The location data is now carried correctly -- the
! non-UTF-8 error is raised WITH a filename and lineno -- but the formatting is
! a separate, corpus-wide change.  Those rows therefore compare the exception
! TYPE, which is also what CPython's own tests assert.
!
! Drives tests/python/compile_and_eval_arguments.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
!
! test_builtin's test_eval, and most of test_compile.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CompileAndEvalArgumentsTestCase removeAllMethods.
CompileAndEvalArgumentsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: CompileAndEvalArgumentsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'compile_and_eval_arguments' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_and_eval_arguments.py')
		name: 'compile_and_eval_arguments'.
%

category: 'Grail-Private'
method: CompileAndEvalArgumentsTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - a byte source'
method: CompileAndEvalArgumentsTestCase
testEveryByteSpellingIsAccepted
	"bytes, bytearray and a buffer, through eval, exec and compile -- one
	decision point, so the three cannot drift apart."

	self assertMatchesCPythonAt: 'bytes_source'.
	self assertMatchesCPythonAt: 'bytearray_source'.
	self assertMatchesCPythonAt: 'bytes_exec'.
	self assertMatchesCPythonAt: 'memoryview_compiles'.
%

category: 'Grail-Tests - a byte source'
method: CompileAndEvalArgumentsTestCase
testAByteOrderMarkIsStrippedNotParsed
	"It is part of the ENCODING, not of the program."

	self assertMatchesCPythonAt: 'bom_bytes_source'.
	self assertMatchesCPythonAt: 'bom_compiles'.
%

category: 'Grail-Tests - a byte source'
method: CompileAndEvalArgumentsTestCase
testABadByteSourceRaisesTheRightKind
	"A TRUNCATED BOM is not a BOM: it is bytes that are not UTF-8, and
	CPython's error is about the ENCODING rather than about the syntax.  A NUL
	is refused in a str source too, which is where Grail used to hand the
	tokenizer a character its message could not print."

	self assertMatchesCPythonAt: 'truncated_bom'.
	self assertMatchesCPythonAt: 'nul_in_str'.
	self assertMatchesCPythonAt: 'nul_in_bytes'.
%

category: 'Grail-Tests - a byte source'
method: CompileAndEvalArgumentsTestCase
testASourceThatIsNeitherIsACatchableTypeError
	"``eval(())'' is the row that caught the first cut's handler: probing for
	``tobytes'' with ``on: Exception'' does not see a Smalltalk
	MessageNotUnderstood, so this died uncatchably instead of raising."

	self assertMatchesCPythonAt: 'tuple_source'.
	self assertMatchesCPythonAt: 'int_source'.
%

category: 'Grail-Tests - compile arguments'
method: CompileAndEvalArgumentsTestCase
testTheSixParametersMayBePassedByKeyword
	"And supplying one BOTH ways is a TypeError with CPython's own wording,
	which names the position as well as the name."

	self assertMatchesCPythonAt: 'kwargs_form'.
	self assertMatchesCPythonAt: 'kwargs_reordered'.
	self assertMatchesCPythonAt: 'kwarg_and_positional'.
	self assertMatchesCPythonAt: 'duplicate_argument'.
%

category: 'Grail-Tests - compile arguments'
method: CompileAndEvalArgumentsTestCase
testTheModeAndFlagsAreValidated
	"Both used to be accepted unchecked, and BOTH failures let a wrong call
	succeed rather than fail: an unknown mode answered the source, and 0xff --
	CO_ bits, which describe a code object rather than directing a compile --
	was taken as a set of compiler flags."

	self assertMatchesCPythonAt: 'bad_mode'.
	self assertMatchesCPythonAt: 'bad_mode_short'.
	self assertMatchesCPythonAt: 'bad_flags'.
	self assertMatchesCPythonAt: 'bad_flags_low_bit'.
%

category: 'Grail-Tests - Controls'
method: CompileAndEvalArgumentsTestCase
testTheRealCompilerFlagsAreStillAccepted
	"The control for the flag check: refusing too much is as wrong as refusing
	nothing.  PyCF_ONLY_AST and PyCF_ALLOW_TOP_LEVEL_AWAIT are directives, and
	zero is the ordinary case."

	self assertMatchesCPythonAt: 'only_ast_flag_accepted'.
	self assertMatchesCPythonAt: 'top_level_await_flag_accepted'.
	self assertMatchesCPythonAt: 'zero_flags'.
%

category: 'Grail-Tests - Controls'
method: CompileAndEvalArgumentsTestCase
testTheOrdinaryShapesAreUnchanged
	"A str source, eval()'s leading-whitespace rule, a non-ASCII literal, and
	the compile-then-run round trip every caller in the corpus uses -- the
	last is what jinja2 does with every template."

	self assertMatchesCPythonAt: 'plain_eval'.
	self assertMatchesCPythonAt: 'leading_whitespace'.
	self assertMatchesCPythonAt: 'non_ascii_str'.
	self assertMatchesCPythonAt: 'compile_then_exec'.
	self assertMatchesCPythonAt: 'compile_then_eval'.
	self assertMatchesCPythonAt: 'syntax_error_still_raised'.
%

category: 'Grail-Tests - Controls'
method: CompileAndEvalArgumentsTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '28 checks, 0 disagreeing [], keys match: True'
%
