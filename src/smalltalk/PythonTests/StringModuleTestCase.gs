! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StringModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StringModuleTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StringModuleTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StringModuleTestCase - Tests for Python string module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
StringModuleTestCase removeAllMethods: 0.
StringModuleTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Constants'
method: StringModuleTestCase
testAsciiLetters
	"Test string.ascii_letters constant (should be lowercase + uppercase)"

	| s result lowercase uppercase |
	s := string @env1:instance.
	result := s @env1:ascii_letters.
	lowercase := s @env1:ascii_lowercase.
	uppercase := s @env1:ascii_uppercase.

	self assert: result equals: lowercase , uppercase
%

category: 'Grail-Tests - Constants'
method: StringModuleTestCase
testAsciiLowercase
	"Test string.ascii_lowercase constant"

	| s result |
	s := string @env1:instance.
	result := s @env1:ascii_lowercase.

	self assert: result equals: 'abcdefghijklmnopqrstuvwxyz'
%

category: 'Grail-Tests - Constants'
method: StringModuleTestCase
testAsciiUppercase
	"Test string.ascii_uppercase constant"

	| s result |
	s := string @env1:instance.
	result := s @env1:ascii_uppercase.

	self assert: result equals: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
%

category: 'Grail-Tests - Utility Functions'
method: StringModuleTestCase
testCapwords
	"Test string.capwords() — Phase-4 fast-path direct method dispatch."

	| s result |
	s := string @env1:instance.

	result := s @env1:capwords: 'hello world'.
	self assert: result equals: 'Hello World'.

	result := s @env1:capwords: 'the quick brown fox'.
	self assert: result equals: 'The Quick Brown Fox'.

	result := s @env1:capwords: '  multiple   spaces  '.
	self assert: result equals: 'Multiple Spaces'.
%

category: 'Grail-Tests - Utility Functions'
method: StringModuleTestCase
testCapwordsEmptyString
	"Test string.capwords() with empty string"

	| s result |
	s := string @env1:instance.

	result := s @env1:capwords: ''.
	self assert: result equals: ''
%

category: 'Grail-Tests - Utility Functions'
method: StringModuleTestCase
testCapwordsSingleWord
	"Test string.capwords() with single word"

	| s result |
	s := string @env1:instance.

	result := s @env1:capwords: 'hello'.
	self assert: result equals: 'Hello'.

	result := s @env1:capwords: 'HELLO'.
	self assert: result equals: 'Hello'
%

category: 'Grail-Tests - Utility Functions'
method: StringModuleTestCase
testCapwordsWithSep
	"Test string.capwords() with custom separator — uses the varargs
	fast path `_capwords:kw:` since kwargs are involved."

	| s result |
	s := string @env1:instance.

	result := s @env1:_capwords: {'hello-world'} kw: {#sep -> '-'}.
	self assert: result equals: 'Hello-World'.

	result := s @env1:_capwords: {'one.two.three'} kw: {#sep -> '.'}.
	self assert: result equals: 'One.Two.Three'
%

category: 'Grail-Tests - Constants'
method: StringModuleTestCase
testDigits
	"Test string.digits constant"

	| s result |
	s := string @env1:instance.
	result := s @env1:digits.

	self assert: result equals: '0123456789'
%

category: 'Grail-Tests - Formatter'
method: StringModuleTestCase
testFormatterBasic
	"Test string.Formatter basic functionality"

	| s formatter result formatter_instance keywords |
	s := string @env1:instance.
	formatter := s @env1:Formatter.
	
	"Create formatter instance"
	formatter_instance := formatter @env1:__new__.
	
	"Test basic formatting with positional args"
	result := formatter_instance @env1:format: 'Hello {0}' _: {'world'} _: nil.
	self assert: result equals: 'Hello world'.
	
	"Test with keyword args"
	keywords := KeyValueDictionary new.
	keywords at: 'name' put: 'Alice'.
	keywords at: 'age' put: 30.
	result := formatter_instance @env1:format: '{name} is {age}' _: {} _: keywords.
	self assert: result equals: 'Alice is 30'
%

category: 'Grail-Tests - Formatter'
method: StringModuleTestCase
testFormatterKeywords
	"Test string.Formatter with keyword arguments"

	| s formatter formatter_instance result keywords1 keywords2 |
	s := string @env1:instance.
	formatter := s @env1:Formatter.
	formatter_instance := formatter @env1:__new__.
	
	"Test with keyword args"
	keywords1 := KeyValueDictionary new.
	keywords1 at: 'name' put: 'World'.
	result := formatter_instance @env1:format: 'Hello {name}' _: {} _: keywords1.
	self assert: result equals: 'Hello World'.
	
	"Test with multiple keywords"
	keywords2 := KeyValueDictionary new.
	keywords2 at: 'x' put: 5.
	keywords2 at: 'y' put: 3.
	keywords2 at: 'z' put: 8.
	result := formatter_instance @env1:format: '{x} + {y} = {z}' _: {} _: keywords2.
	self assert: result equals: '5 + 3 = 8'
%

category: 'Grail-Tests - Formatter'
method: StringModuleTestCase
testFormatterLiteral
	"Test string.Formatter with literal text"

	| s formatter formatter_instance result |
	s := string @env1:instance.
	formatter := s @env1:Formatter.
	formatter_instance := formatter @env1:__new__.
	
	"Test with only literal text"
	result := formatter_instance @env1:format: 'Hello World' _: {} _: nil.
	self assert: result equals: 'Hello World'.
	
	"Test with literal and field"
	result := formatter_instance @env1:format: 'Hello {0}!' _: {'world'} _: nil.
	self assert: result equals: 'Hello world!'
%

category: 'Grail-Tests - Formatter'
method: StringModuleTestCase
testFormatterPositional
	"Test string.Formatter with positional arguments"

	| s formatter formatter_instance result |
	s := string @env1:instance.
	formatter := s @env1:Formatter.
	formatter_instance := formatter @env1:__new__.
	
	"Test with numbered positional args"
	result := formatter_instance @env1:format: '{0} {1} {2}' _: {'one'. 'two'. 'three'} _: nil.
	self assert: result equals: 'one two three'.
	
	"Test with reordered args"
	result := formatter_instance @env1:format: '{2} {0} {1}' _: {'first'. 'second'. 'third'} _: nil.
	self assert: result equals: 'third first second'
%

category: 'Grail-Tests - Constants'
method: StringModuleTestCase
testHexdigits
	"Test string.hexdigits constant"

	| s result |
	s := string @env1:instance.
	result := s @env1:hexdigits.

	self assert: result equals: '0123456789abcdefABCDEF'
%

category: 'Grail-Tests - Constants'
method: StringModuleTestCase
testOctdigits
	"Test string.octdigits constant"

	| s result |
	s := string @env1:instance.
	result := s @env1:octdigits.

	self assert: result equals: '01234567'
%

category: 'Grail-Tests - Constants'
method: StringModuleTestCase
testPrintable
	"Test string.printable constant (should contain digits, letters, punctuation, whitespace)"

	| s result digits ascii_letters punctuation whitespace |
	s := string @env1:instance.
	result := s @env1:printable.
	digits := s @env1:digits.
	ascii_letters := s @env1:ascii_letters.
	punctuation := s @env1:punctuation.
	whitespace := s @env1:whitespace.

	"Check that printable contains all component parts"
	self assert: (result @env1:__contains__: digits).
	self assert: (result @env1:__contains__: ascii_letters).
	self assert: (result @env1:__contains__: punctuation).
	self assert: (result @env1:__contains__: whitespace)
%

category: 'Grail-Tests - Constants'
method: StringModuleTestCase
testPunctuation
	"Test string.punctuation constant"

	| s result |
	s := string @env1:instance.
	result := s @env1:punctuation.

	"Check that it contains common punctuation characters"
	self assert: (result @env1:__contains__: '!').
	self assert: (result @env1:__contains__: '@').
	self assert: (result @env1:__contains__: '#')
%

category: 'Grail-Tests - Constants'
method: StringModuleTestCase
testWhitespace
	"Test string.whitespace constant"

	| s result |
	s := string @env1:instance.
	result := s @env1:whitespace.

	"Check that it contains the ACTUAL whitespace characters — space,
	tab (code 9), newline (code 10) — not the two-character literals
	``\t'' / ``\n''.  A Smalltalk string literal does not interpret
	backslash escapes, so asserting containment of ``\t'' would lock
	in a bug in the constant."
	self assert: (result @env1:__contains__: ' ').
	self assert: (result @env1:__contains__: (Unicode7 with: (Character codePoint: 9))).
	self assert: (result @env1:__contains__: (Unicode7 with: (Character codePoint: 10))).
	self assert: (result size) equals: 6
%
