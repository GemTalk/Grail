! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'EvalAndEscapesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
EvalAndEscapesTestCase comment:
'What eval() does with a string before it parses it, and what the
tokenizer does with the escapes inside one.

Two unrelated things, together because one found the other: six of
test_string_literals'' failures were a leading SPACE, and once those
stopped failing, two more turned out to be CRASHES that the first
failure had been hiding.

LEADING WHITESPACE.  ``eval'' strips it; ``exec'' does not, and neither
does ``compile(src, f, ''eval'')'' -- so this is not a property of
expressions but a rule of the eval BUILTIN, which the documentation
states: the source ``will be parsed as if it were an expression, with
leading whitespace stripped''.  It is what makes the triple-quoted
idiom work, which is how CPython''s own suite writes literal tests.
Exactly lstrip of spaces and tabs: a leading NEWLINE is not stripped,
so an indented second line still raises, and raises about line 2.

TRUNCATED HEX ESCAPES were an UNCATCHABLE crash.  Each of \x, \u and
\U read its digits with a fixed run of ``advance'' and no check at all;
at the end of the source that answers nil, and appending nil raised a
MessageNotUnderstood out of the TOKENIZER -- fatal to whatever was
compiling, and not something ``except SyntaxError'' could ever see.  A
non-hex digit was no better: it was consumed and handed to the integer
parser, so a bad escape produced whatever that made of it instead of
raising.  Digits are now taken only while they ARE hex, which is also
what makes the reported span right: CPython counts from the backslash
to the last character actually consumed.

AN OCTAL ESCAPE OVER \377 was the same class of crash in a bytes
literal.  CPython wraps it -- b''\400'' is b''\x00'' -- and Grail carried
256 through to ByteArray at:put:, which raised ArgumentError 2099 out of
the PARSER.  A str literal is not wrapped: ''\400'' is chr(256), a
perfectly good character.

Took test.test_string_literals 13 -> 6, and test_builtin''s test_eval
off its IndentationError and onto the code-object limitation that is
its real remaining problem.

STILL OPEN there: Grail emits no SyntaxWarning for an invalid escape.
That is the rest of the module, and a separate change -- the fixture
silences CPython''s warnings rather than pretending they are not
raised.

See tests/python/eval_leading_whitespace.py (9 checks,
CPython-validated first).'
%

expectvalue /Class
doit
EvalAndEscapesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
EvalAndEscapesTestCase removeAllMethods: 0.
EvalAndEscapesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: EvalAndEscapesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'eval_leading_whitespace' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/eval_leading_whitespace.py')
		name: 'eval_leading_whitespace'.
%

category: 'Grail-Helpers'
method: EvalAndEscapesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: EvalAndEscapesTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: EvalAndEscapesTestCase
testEvalStripsLeadingWhitespace
	"Including the triple-quoted idiom that is the whole reason it
	matters."

	self assertAll: #('eval_strips' 'the_triple_quoted_idiom')
%

category: 'Grail-Tests'
method: EvalAndEscapesTestCase
testOnlySpacesAndTabsAndOnlyEval
	"A leading newline is not stripped -- what follows it is a second
	line, and an indented second line is an indented line.  exec and
	compile strip nothing, which is what places the rule in eval()."

	self assertAll: #('a_newline_is_not_stripped' 'exec_does_not_strip'
		'compile_does_not_strip' 'bindings_still_land')
%

category: 'Grail-Tests'
method: EvalAndEscapesTestCase
testStrippingDoesNotDisturbACompiledSource
	"The regression the first cut of this change caused, and the reason
	it is pinned: the mode registry that tells a compiled ``exec'' source
	from a plain expression is keyed by the source OBJECT, so stripping
	before the probe handed it a copy and the statements ran as one
	expression."

	self assertAll: #('a_compiled_exec_source_still_runs_as_statements'
		'a_decorator_raises_its_own_exception')
%

category: 'Grail-Tests'
method: EvalAndEscapesTestCase
testTruncatedHexEscapesRaiseRatherThanCrash
	"Sixteen shapes, every one of which used to reach a Smalltalk error
	from inside the tokenizer -- uncatchable, and fatal to the compile."

	self assertAll: #('truncated_escapes_are_syntax_errors')
%

category: 'Grail-Tests'
method: EvalAndEscapesTestCase
testOctalEscapesWrapInBytesAndNotInStr
	"b'\\400' is b'\\x00' and '\\400' is chr(256).  The first used to raise
	ArgumentError 2099 out of the parser."

	self assertAll: #('octal_escapes' 'the_complete_escapes_still_work')
%
