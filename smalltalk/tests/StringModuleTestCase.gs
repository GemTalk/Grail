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
StringModuleTestCase category: 'SUnit'
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

category: 'Tests - Constants'
method: StringModuleTestCase
testAsciiLetters
	"Test string.ascii_letters constant (should be lowercase + uppercase)"

	| s result lowercase uppercase |
	s := string perform: #instance env: 2.
	result := s perform: #ascii_letters env: 2.
	lowercase := s perform: #ascii_lowercase env: 2.
	uppercase := s perform: #ascii_uppercase env: 2.

	self assert: result equals: lowercase , uppercase
%

category: 'Tests - Constants'
method: StringModuleTestCase
testAsciiLowercase
	"Test string.ascii_lowercase constant"

	| s result |
	s := string perform: #instance env: 2.
	result := s perform: #ascii_lowercase env: 2.

	self assert: result equals: 'abcdefghijklmnopqrstuvwxyz'
%

category: 'Tests - Constants'
method: StringModuleTestCase
testAsciiUppercase
	"Test string.ascii_uppercase constant"

	| s result |
	s := string perform: #instance env: 2.
	result := s perform: #ascii_uppercase env: 2.

	self assert: result equals: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
%

category: 'Tests - Utility Functions'
method: StringModuleTestCase
testCapwords
	"Test string.capwords() function"

	| s capwordsBlock result |
	s := string perform: #instance env: 2.
	capwordsBlock := s perform: #capwords env: 2.

	result := capwordsBlock value: {'hello world'} value: nil.
	self assert: result equals: 'Hello World'.

	result := capwordsBlock value: {'the quick brown fox'} value: nil.
	self assert: result equals: 'The Quick Brown Fox'.

	result := capwordsBlock value: {'  multiple   spaces  '} value: nil.
	self assert: result equals: 'Multiple Spaces'.
%

category: 'Tests - Utility Functions'
method: StringModuleTestCase
testCapwordsEmptyString
	"Test string.capwords() with empty string"

	| s capwordsBlock result |
	s := string perform: #instance env: 2.
	capwordsBlock := s perform: #capwords env: 2.

	result := capwordsBlock value: {''} value: nil.
	self assert: result equals: ''
%

category: 'Tests - Utility Functions'
method: StringModuleTestCase
testCapwordsSingleWord
	"Test string.capwords() with single word"

	| s capwordsBlock result |
	s := string perform: #instance env: 2.
	capwordsBlock := s perform: #capwords env: 2.

	result := capwordsBlock value: {'hello'} value: nil.
	self assert: result equals: 'Hello'.

	result := capwordsBlock value: {'HELLO'} value: nil.
	self assert: result equals: 'Hello'
%

category: 'Tests - Utility Functions'
method: StringModuleTestCase
testCapwordsWithSep
	"Test string.capwords() function with custom separator"

	| s capwordsBlock result |
	s := string perform: #instance env: 2.
	capwordsBlock := s perform: #capwords env: 2.

	result := capwordsBlock value: {'hello-world'} value: {#sep -> '-'}.
	self assert: result equals: 'Hello-World'.

	result := capwordsBlock value: {'one.two.three'} value: {#sep -> '.'}.
	self assert: result equals: 'One.Two.Three'
%

category: 'Tests - Constants'
method: StringModuleTestCase
testDigits
	"Test string.digits constant"

	| s result |
	s := string perform: #instance env: 2.
	result := s perform: #digits env: 2.

	self assert: result equals: '0123456789'
%

category: 'Tests - Formatter'
method: StringModuleTestCase
testFormatterBasic
	"Test string.Formatter basic functionality"

	| s formatter result formatter_instance keywords |
	s := string perform: #instance env: 2.
	formatter := s perform: #Formatter env: 2.
	
	"Create formatter instance"
	formatter_instance := formatter perform: #__new__ env: 2.
	
	"Test basic formatting with positional args"
	result := formatter_instance perform: #format:_:_: env: 2 withArguments: {'Hello {0}'. {'world'}. nil}.
	self assert: result equals: 'Hello world'.
	
	"Test with keyword args"
	keywords := KeyValueDictionary new.
	keywords at: 'name' put: 'Alice'.
	keywords at: 'age' put: 30.
	result := formatter_instance perform: #format:_:_: env: 2 withArguments: {'{name} is {age}'. {}. keywords}.
	self assert: result equals: 'Alice is 30'
%

category: 'Tests - Formatter'
method: StringModuleTestCase
testFormatterKeywords
	"Test string.Formatter with keyword arguments"

	| s formatter formatter_instance result keywords1 keywords2 |
	s := string perform: #instance env: 2.
	formatter := s perform: #Formatter env: 2.
	formatter_instance := formatter perform: #__new__ env: 2.
	
	"Test with keyword args"
	keywords1 := KeyValueDictionary new.
	keywords1 at: 'name' put: 'World'.
	result := formatter_instance perform: #format:_:_: env: 2 withArguments: {'Hello {name}'. {}. keywords1}.
	self assert: result equals: 'Hello World'.
	
	"Test with multiple keywords"
	keywords2 := KeyValueDictionary new.
	keywords2 at: 'x' put: 5.
	keywords2 at: 'y' put: 3.
	keywords2 at: 'z' put: 8.
	result := formatter_instance perform: #format:_:_: env: 2 withArguments: {'{x} + {y} = {z}'. {}. keywords2}.
	self assert: result equals: '5 + 3 = 8'
%

category: 'Tests - Formatter'
method: StringModuleTestCase
testFormatterLiteral
	"Test string.Formatter with literal text"

	| s formatter formatter_instance result |
	s := string perform: #instance env: 2.
	formatter := s perform: #Formatter env: 2.
	formatter_instance := formatter perform: #__new__ env: 2.
	
	"Test with only literal text"
	result := formatter_instance perform: #format:_:_: env: 2 withArguments: {'Hello World'. {}. nil}.
	self assert: result equals: 'Hello World'.
	
	"Test with literal and field"
	result := formatter_instance perform: #format:_:_: env: 2 withArguments: {'Hello {0}!'. {'world'}. nil}.
	self assert: result equals: 'Hello world!'
%

category: 'Tests - Formatter'
method: StringModuleTestCase
testFormatterPositional
	"Test string.Formatter with positional arguments"

	| s formatter formatter_instance result |
	s := string perform: #instance env: 2.
	formatter := s perform: #Formatter env: 2.
	formatter_instance := formatter perform: #__new__ env: 2.
	
	"Test with numbered positional args"
	result := formatter_instance perform: #format:_:_: env: 2 withArguments: {'{0} {1} {2}'. {'one'. 'two'. 'three'}. nil}.
	self assert: result equals: 'one two three'.
	
	"Test with reordered args"
	result := formatter_instance perform: #format:_:_: env: 2 withArguments: {'{2} {0} {1}'. {'first'. 'second'. 'third'}. nil}.
	self assert: result equals: 'third first second'
%

category: 'Tests - Constants'
method: StringModuleTestCase
testHexdigits
	"Test string.hexdigits constant"

	| s result |
	s := string perform: #instance env: 2.
	result := s perform: #hexdigits env: 2.

	self assert: result equals: '0123456789abcdefABCDEF'
%

category: 'Tests - Constants'
method: StringModuleTestCase
testOctdigits
	"Test string.octdigits constant"

	| s result |
	s := string perform: #instance env: 2.
	result := s perform: #octdigits env: 2.

	self assert: result equals: '01234567'
%

category: 'Tests - Constants'
method: StringModuleTestCase
testPrintable
	"Test string.printable constant (should contain digits, letters, punctuation, whitespace)"

	| s result digits ascii_letters punctuation whitespace |
	s := string perform: #instance env: 2.
	result := s perform: #printable env: 2.
	digits := s perform: #digits env: 2.
	ascii_letters := s perform: #ascii_letters env: 2.
	punctuation := s perform: #punctuation env: 2.
	whitespace := s perform: #whitespace env: 2.

	"Check that printable contains all component parts"
	self assert: (result perform: #'__contains__:' env: 2 withArguments: {digits}).
	self assert: (result perform: #'__contains__:' env: 2 withArguments: {ascii_letters}).
	self assert: (result perform: #'__contains__:' env: 2 withArguments: {punctuation}).
	self assert: (result perform: #'__contains__:' env: 2 withArguments: {whitespace})
%

category: 'Tests - Constants'
method: StringModuleTestCase
testPunctuation
	"Test string.punctuation constant"

	| s result |
	s := string perform: #instance env: 2.
	result := s perform: #punctuation env: 2.

	"Check that it contains common punctuation characters"
	self assert: (result perform: #'__contains__:' env: 2 withArguments: {'!'}).
	self assert: (result perform: #'__contains__:' env: 2 withArguments: {'@'}).
	self assert: (result perform: #'__contains__:' env: 2 withArguments: {'#'})
%

category: 'Tests - Constants'
method: StringModuleTestCase
testWhitespace
	"Test string.whitespace constant"

	| s result |
	s := string perform: #instance env: 2.
	result := s perform: #whitespace env: 2.

	"Check that it contains common whitespace characters"
	self assert: (result perform: #'__contains__:' env: 2 withArguments: {' '}).
	self assert: (result perform: #'__contains__:' env: 2 withArguments: {'\t'}).
	self assert: (result perform: #'__contains__:' env: 2 withArguments: {'\n'})
%
