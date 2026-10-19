Class {
	#name : 'CompileAndEvalArgumentsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CompileAndEvalArgumentsTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
CompileAndEvalArgumentsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'compile_and_eval_arguments' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_and_eval_arguments.py')
		name: 'compile_and_eval_arguments'.

]

{ #category : 'Grail-Tests - a byte source' }
CompileAndEvalArgumentsTestCase >> testABadByteSourceRaisesTheRightKind [
	"A TRUNCATED BOM is not a BOM: it is bytes that are not UTF-8, and
	CPython's error is about the ENCODING rather than about the syntax.  A NUL
	is refused in a str source too, which is where Grail used to hand the
	tokenizer a character its message could not print."

	self assertMatchesCPythonAt: 'truncated_bom'.
	self assertMatchesCPythonAt: 'nul_in_str'.
	self assertMatchesCPythonAt: 'nul_in_bytes'.

]

{ #category : 'Grail-Tests - a byte source' }
CompileAndEvalArgumentsTestCase >> testAByteOrderMarkIsStrippedNotParsed [
	"It is part of the ENCODING, not of the program."

	self assertMatchesCPythonAt: 'bom_bytes_source'.
	self assertMatchesCPythonAt: 'bom_compiles'.

]

{ #category : 'Grail-Tests - a byte source' }
CompileAndEvalArgumentsTestCase >> testASourceThatIsNeitherIsACatchableTypeError [
	"``eval(())'' is the row that caught the first cut's handler: probing for
	``tobytes'' with ``on: Exception'' does not see a Smalltalk
	MessageNotUnderstood, so this died uncatchably instead of raising."

	self assertMatchesCPythonAt: 'tuple_source'.
	self assertMatchesCPythonAt: 'int_source'.

]

{ #category : 'Grail-Tests - a byte source' }
CompileAndEvalArgumentsTestCase >> testEveryByteSpellingIsAccepted [
	"bytes, bytearray and a buffer, through eval, exec and compile -- one
	decision point, so the three cannot drift apart."

	self assertMatchesCPythonAt: 'bytes_source'.
	self assertMatchesCPythonAt: 'bytearray_source'.
	self assertMatchesCPythonAt: 'bytes_exec'.
	self assertMatchesCPythonAt: 'memoryview_compiles'.

]

{ #category : 'Grail-Tests - Controls' }
CompileAndEvalArgumentsTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '28 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - compile arguments' }
CompileAndEvalArgumentsTestCase >> testTheModeAndFlagsAreValidated [
	"Both used to be accepted unchecked, and BOTH failures let a wrong call
	succeed rather than fail: an unknown mode answered the source, and 0xff --
	CO_ bits, which describe a code object rather than directing a compile --
	was taken as a set of compiler flags."

	self assertMatchesCPythonAt: 'bad_mode'.
	self assertMatchesCPythonAt: 'bad_mode_short'.
	self assertMatchesCPythonAt: 'bad_flags'.
	self assertMatchesCPythonAt: 'bad_flags_low_bit'.

]

{ #category : 'Grail-Tests - Controls' }
CompileAndEvalArgumentsTestCase >> testTheOrdinaryShapesAreUnchanged [
	"A str source, eval()'s leading-whitespace rule, a non-ASCII literal, and
	the compile-then-run round trip every caller in the corpus uses -- the
	last is what jinja2 does with every template."

	self assertMatchesCPythonAt: 'plain_eval'.
	self assertMatchesCPythonAt: 'leading_whitespace'.
	self assertMatchesCPythonAt: 'non_ascii_str'.
	self assertMatchesCPythonAt: 'compile_then_exec'.
	self assertMatchesCPythonAt: 'compile_then_eval'.
	self assertMatchesCPythonAt: 'syntax_error_still_raised'.

]

{ #category : 'Grail-Tests - Controls' }
CompileAndEvalArgumentsTestCase >> testTheRealCompilerFlagsAreStillAccepted [
	"The control for the flag check: refusing too much is as wrong as refusing
	nothing.  PyCF_ONLY_AST and PyCF_ALLOW_TOP_LEVEL_AWAIT are directives, and
	zero is the ordinary case."

	self assertMatchesCPythonAt: 'only_ast_flag_accepted'.
	self assertMatchesCPythonAt: 'top_level_await_flag_accepted'.
	self assertMatchesCPythonAt: 'zero_flags'.

]

{ #category : 'Grail-Tests - compile arguments' }
CompileAndEvalArgumentsTestCase >> testTheSixParametersMayBePassedByKeyword [
	"And supplying one BOTH ways is a TypeError with CPython's own wording,
	which names the position as well as the name."

	self assertMatchesCPythonAt: 'kwargs_form'.
	self assertMatchesCPythonAt: 'kwargs_reordered'.
	self assertMatchesCPythonAt: 'kwarg_and_positional'.
	self assertMatchesCPythonAt: 'duplicate_argument'.

]
