! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SyntaxErrorMessagesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SyntaxErrorMessagesTestCase comment:
'CPython 3.14.8''s SyntaxError message and position -- type, msg, lineno,
offset, end_lineno, end_offset -- for each invalid source in
tests/python/syntax_error_messages.py: the grammar''s specialised messages
(invalid targets, missing commas, forced colons, indentation), the tokenizer''s
(numeric literals, unterminated strings, brackets, non-UTF-8 source) and the
compiler''s (return or break out of place, starred expressions).

Every expectation was produced by CPython 3.14.8; the fixture gate re-checks
it there.'
%

doit
SyntaxErrorMessagesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
SyntaxErrorMessagesTestCase removeAllMethods: 0.
SyntaxErrorMessagesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: SyntaxErrorMessagesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'syntax_error_messages' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/syntax_error_messages.py')
		name: 'syntax_error_messages'.
%

category: 'Grail-Tests'
method: SyntaxErrorMessagesTestCase
testEverySourceMatchesCPython
	"FAILED lists the keys whose result differs from CPython's."

	| failed |
	failed := testModule @env1:___pyAttrLoad___: #FAILED.
	self assert: (failed @env1:__len__) = 0
		description: 'differ from CPython: ' , (failed @env1:__repr__) asString
%
