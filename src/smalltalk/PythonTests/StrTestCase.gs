! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StrTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StrTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StrTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing behavior from StrTestCase

set compile_env: 0

expectvalue /Metaclass3
doit
StrTestCase removeAllMethods.
StrTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-String Operations'
method: StrTestCase
testUnboundMethodViaStrType
	"``str.strip'' etc. accessed on the str builtin is an UNBOUND method:
	str.strip(x) == x.strip(), and it composes with map().  The str builtin
	is a BoundMethod (there is no single str class -- strings span
	Unicode7/Unicode16/... under CharacterCollection), so attribute access
	delegates to CharacterCollection's methods, mirroring int.bit_length
	against Integer.  test_fractions test_float_format_testfile relies on
	``map(str.strip, ...)''."

	self assert: (self eval: 'str.strip("  hi  ") == "hi"').
	self assert: (self eval: 'str.upper("hi") == "HI"').
	self assert: (self eval: 'list(map(str.strip, ["  a  ", " b ", "c"])) == ["a", "b", "c"]').
%

category: 'Grail-String Operations'
method: StrTestCase
test__add__
	"Test string concatenation with +"

	| s1 s2 result |
	s1 := 'hello'.
	s2 := ' world'.
	result := s1 @env1:__add__: s2.
	self assert: result equals: 'hello world'.
%

category: 'Grail-Sequence Operations'
method: StrTestCase
test__contains__
	"Test substring containment"

	| s result |
	s := 'hello world'.
	result := s @env1:__contains__:  'world' .
	self assert: result equals: true.

	result := s @env1:__contains__:  'xyz' .
	self assert: result equals: false.
%

category: 'Grail-Comparison'
method: StrTestCase
test__eq__
	"Test string equality"

	| s1 s2 result |
	s1 := 'hello'.
	s2 := 'hello'.
	result := s1 @env1:__eq__: s2.
	self assert: result equals: true.
%

category: 'Grail-Comparison'
method: StrTestCase
test__ge__
	"Test string greater than or equal"

	| s1 s2 result |
	s1 := 'banana'.
	s2 := 'banana'.
	result := s1 @env1:__ge__: s2.
	self assert: result equals: true.
%

category: 'Grail-Sequence Operations'
method: StrTestCase
test__getitem__
	"Test string indexing: s[index]"

	| s result |
	s := 'hello'.
	
	"Positive indices (0-based)"
	result := s @env1:__getitem__: 0.
	self assert: result equals: 'h'.
	self assert: result class equals: Unicode7.
	
	result := s @env1:__getitem__: 1.
	self assert: result equals: 'e'.
	
	result := s @env1:__getitem__: 4.
	self assert: result equals: 'o'.
%

category: 'Grail-Sequence Operations'
method: StrTestCase
test__getitem__emptyString
	"Test indexing on empty string raises IndexError"

	| s |
	s := ''.
	
	self should: [s @env1:__getitem__: 0] raise: IndexError.
	self should: [s @env1:__getitem__: -1] raise: IndexError.
%

category: 'Grail-Sequence Operations'
method: StrTestCase
test__getitem__negative
	"Test negative indexing: s[-1]"

	| s result |
	s := 'hello'.
	
	"Negative indices"
	result := s @env1:__getitem__: -1.
	self assert: result equals: 'o'.
	
	result := s @env1:__getitem__: -2.
	self assert: result equals: 'l'.
	
	result := s @env1:__getitem__: -5.
	self assert: result equals: 'h'.
%

category: 'Grail-Sequence Operations'
method: StrTestCase
test__getitem__outOfRange
	"Test index out of range raises IndexError"

	| s |
	s := 'hello'.
	
	"Out of bounds positive index"
	self should: [s @env1:__getitem__: 5] raise: IndexError.
	self should: [s @env1:__getitem__: 10] raise: IndexError.
	
	"Out of bounds negative index"
	self should: [s @env1:__getitem__: -6] raise: IndexError.
	self should: [s @env1:__getitem__: -10] raise: IndexError.
%

category: 'Grail-Comparison'
method: StrTestCase
test__gt__
	"Test string greater than"

	| s1 s2 result |
	s1 := 'banana'.
	s2 := 'apple'.
	result := s1 @env1:__gt__: s2.
	self assert: result equals: true.
%

category: 'Grail-Hashing & Identity'
method: StrTestCase
test__hash__
	"Test that __hash__ returns a hash value"

	| s result |
	s := 'hello'.
	result := s @env1:__hash__.
	self assert: result class equals: SmallInteger.
%

category: 'Grail-Comparison'
method: StrTestCase
test__le__
	"Test string less than or equal"

	| s1 s2 result |
	s1 := 'apple'.
	s2 := 'apple'.
	result := s1 @env1:__le__: s2.
	self assert: result equals: true.
%

category: 'Grail-Sequence Operations'
method: StrTestCase
test__len__
	"Test string length"

	| s result |
	s := 'hello'.
	result := s @env1:__len__.
	self assert: result equals: 5.
%

category: 'Grail-Comparison'
method: StrTestCase
test__lt__
	"Test string less than"

	| s1 s2 result |
	s1 := 'apple'.
	s2 := 'banana'.
	result := s1 @env1:__lt__: s2.
	self assert: result equals: true.
%

category: 'Grail-String Operations'
method: StrTestCase
test__mul__
	"Test string repetition with *"

	| s result |
	s := 'ab'.
	result := s @env1:__mul__: 3.
	self assert: result equals: 'ababab'.
%

category: 'Grail-String Operations'
method: StrTestCase
test__mul__Zero
	"Test string repetition with 0"

	| s result |
	s := 'ab'.
	result := s @env1:__mul__: 0.
	self assert: result equals: ''.
%

category: 'Grail-Comparison'
method: StrTestCase
test__ne__
	"Test string inequality"

	| s1 s2 result |
	s1 := 'hello'.
	s2 := 'world'.
	result := s1 @env1:__ne__: s2.
	self assert: result equals: true.
%

category: 'Grail-Initialization'
method: StrTestCase
test__new__WithNil
	"Test that str(None) returns empty string"

	| result |
	result := str ___new___: nil.
	self assert: result equals: ''.
%

category: 'Grail-Initialization'
method: StrTestCase
test__new__WithString
	"Test that str('hello') returns the same string"

	| result |
	result := str ___new___: 'hello'.
	self assert: result equals: 'hello'.
%

category: 'Grail-String Representation'
method: StrTestCase
test__repr__
	"Test __repr__ adds quotes"

	| s result |
	s := 'hello'.
	result := s @env1:__repr__.
	self assert: result equals: '''hello'''.
%

category: 'Grail-String Representation'
method: StrTestCase
test__repr__WithApostrophe
	"Test __repr__ switches to a double-quote delimiter when the string contains
	a single quote and no double quote, so the quote is not backslash-escaped --
	matching CPython repr of it-apostrophe-s."

	| s result |
	s := 'it''s'.
	result := s @env1:__repr__.
	self assert: result equals: '"it''s"'.
%

category: 'Grail-String Operations'
method: StrTestCase
test__rmul__
	"Test reverse string repetition"

	| s result |
	s := 'ab'.
	result := s @env1:__rmul__: 3.
	self assert: result equals: 'ababab'.
%

category: 'Grail-String Representation'
method: StrTestCase
test__str__
	"Test __str__ returns self"

	| s result |
	s := 'hello'.
	result := s @env1:__str__.
	self assert: result equals: s.
%

category: 'Grail-String Methods'
method: StrTestCase
testCapitalize
	"Test capitalize() method"

	| s result |
	s := 'hello world'.
	result := s @env1:capitalize.
	self assert: result equals: 'Hello world'.
%

category: 'Grail-String Methods'
method: StrTestCase
testCasefold
	"Test casefold() method"

	| s result |
	s := 'HELLO'.
	result := s @env1:casefold.
	self assert: result equals: 'hello'.
%

category: 'Grail-String Methods'
method: StrTestCase
testCenter
	"Test center() method"

	| s result |
	s := 'hi'.
	result := s @env1:center: 10.
	self assert: result size equals: 10.
	self assert: result trimBoth equals: 'hi'.
%

category: 'Grail-String Methods'
method: StrTestCase
testCount
	"Test count() method"

	| s result |
	s := 'hello world'.
	result := s @env1:count: 'l'.
	self assert: result equals: 3.

	result := s @env1:count: 'o'.
	self assert: result equals: 2.

	result := s @env1:count: 'xyz'.
	self assert: result equals: 0.
%

category: 'Grail-String Methods'
method: StrTestCase
testEndswith
	"Test endswith() method"

	| s result |
	s := 'hello world'.
	result := s @env1:endswith: 'world'.
	self assert: result equals: true.

	result := s @env1:endswith: 'hello'.
	self assert: result equals: false.
%

category: 'Grail-Tests - Eval - String Methods'
method: StrTestCase
testEvalLen
	"Test len() on strings via Python source"

	self assert: (self eval: 'len("hello")') equals: 5.
	self assert: (self eval: 'len("")') equals: 0.
%

category: 'Grail-Tests - Eval - String Operations'
method: StrTestCase
testEvalStringConcatenation
	"Test string + string via Python source"

	self assert: (self eval: '"hello" + " world"') equals: 'hello world'.
%

category: 'Grail-Tests - Eval - String Operations'
method: StrTestCase
testEvalStringContains
	"Test in operator for strings via Python source"

	self assert: (self eval: '"world" in "hello world"').
	self deny: (self eval: '"xyz" in "hello world"').
%

category: 'Grail-Tests - Eval - String Operations'
method: StrTestCase
testEvalStringIndexing
	"Test string indexing via Python source"

	self assert: (self eval: '"hello"[0]') equals: 'h'.
	self assert: (self eval: '"hello"[4]') equals: 'o'.
	self assert: (self eval: '"hello"[-1]') equals: 'o'.
%

category: 'Grail-Tests - Eval - String Creation'
method: StrTestCase
testEvalStringLiteral
	"Test string literal creation via Python source"

	self assert: (self eval: '"hello"') equals: 'hello'.
	self assert: (self eval: '''hello''') equals: 'hello'.
%

category: 'Grail-Tests - Eval - String Operations'
method: StrTestCase
testEvalStringRepetition
	"Test string * n via Python source"

	self assert: (self eval: '"ab" * 3') equals: 'ababab'.
%

category: 'Grail-String Methods'
method: StrTestCase
testExpandtabs
	"Test expandtabs() method"

	| s result |
	s := 'hello	world'.
	result := s @env1:expandtabs.
	self assert: (result includesString: '	') equals: false.
%

category: 'Grail-String Methods'
method: StrTestCase
testFind
	"Test find() method"

	| s result |
	s := 'hello world'.
	result := s @env1:find: 'world'.
	self assert: result equals: 6.  "0-based index"

	result := s @env1:find: 'xyz'.
	self assert: result equals: -1.
%

category: 'Grail-String Methods'
method: StrTestCase
testIndex
	"Test index() method"

	| s result |
	s := 'hello world'.
	result := s @env1:index: 'world'.
	self assert: result equals: 6.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIsalnum
	"Test isalnum() method"

	| s result |
	s := 'hello123'.
	result := s @env1:isalnum.
	self assert: result equals: true.

	s := 'hello 123'.
	result := s @env1:isalnum.
	self assert: result equals: false.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIsalpha
	"Test isalpha() method"

	| s result |
	s := 'hello'.
	result := s @env1:isalpha.
	self assert: result equals: true.

	s := 'hello123'.
	result := s @env1:isalpha.
	self assert: result equals: false.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIsascii
	"Test isascii() method"

	| s result |
	s := 'hello'.
	result := s @env1:isascii.
	self assert: result equals: true.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIsdecimal
	"Test isdecimal() method"

	| s result |
	s := '123'.
	result := s @env1:isdecimal.
	self assert: result equals: true.

	s := '123abc'.
	result := s @env1:isdecimal.
	self assert: result equals: false.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIsdigit
	"Test isdigit() method"

	| s result |
	s := '123'.
	result := s @env1:isdigit.
	self assert: result equals: true.

	s := '123abc'.
	result := s @env1:isdigit.
	self assert: result equals: false.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIsidentifier
	"Test isidentifier() method"

	| s result |
	s := 'hello_world'.
	result := s @env1:isidentifier.
	self assert: result equals: true.

	s := '123abc'.
	result := s @env1:isidentifier.
	self assert: result equals: false.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIslower
	"Test islower() method"

	| s result |
	s := 'hello'.
	result := s @env1:islower.
	self assert: result equals: true.

	s := 'Hello'.
	result := s @env1:islower.
	self assert: result equals: false.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIsnumeric
	"Test isnumeric() method"

	| s result |
	s := '123'.
	result := s @env1:isnumeric.
	self assert: result equals: true.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIsprintable
	"Test isprintable() method"

	| s result |
	s := 'hello'.
	result := s @env1:isprintable.
	self assert: result equals: true.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIsspace
	"Test isspace() method"

	| s result |
	s := '   '.
	result := s @env1:isspace.
	self assert: result equals: true.

	s := '  a  '.
	result := s @env1:isspace.
	self assert: result equals: false.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIstitle
	"Test istitle() method"

	| s result |
	s := 'Hello World'.
	result := s @env1:istitle.
	self assert: result equals: true.

	s := 'Hello world'.
	result := s @env1:istitle.
	self assert: result equals: false.
%

category: 'Grail-String Test Methods'
method: StrTestCase
testIsupper
	"Test isupper() method"

	| s result |
	s := 'HELLO'.
	result := s @env1:isupper.
	self assert: result equals: true.

	s := 'Hello'.
	result := s @env1:isupper.
	self assert: result equals: false.
%

category: 'Grail-String Methods'
method: StrTestCase
testJoin
	"Test join() method"

	| sep parts result |
	sep := ', '.
	parts := #('apple' 'banana' 'cherry').
	result := sep @env1:join: parts.
	self assert: result equals: 'apple, banana, cherry'.
%

category: 'Grail-String Methods'
method: StrTestCase
testLjust
	"Test ljust() method"

	| s result |
	s := 'hi'.
	result := s @env1:ljust: 10.
	self assert: result size equals: 10.
	self assert: (result beginsWith: 'hi') equals: true.
%

category: 'Grail-String Methods'
method: StrTestCase
testLower
	"Test lower() method"

	| s result |
	s := 'HELLO'.
	result := s @env1:lower.
	self assert: result equals: 'hello'.
%

category: 'Grail-String Methods'
method: StrTestCase
testLstrip
	"Test lstrip() method"

	| s result |
	s := '  hello  '.
	result := s @env1:lstrip.
	self assert: result equals: 'hello  '.
%

category: 'Grail-String Methods'
method: StrTestCase
testPartition
	"Test partition() method"

	| s result |
	s := 'hello world'.
	result := s @env1:partition: ' '.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 'hello'.
	self assert: (result at: 2) equals: ' '.
	self assert: (result at: 3) equals: 'world'.
%

category: 'Grail-String Methods'
method: StrTestCase
testRemoveprefix
	"Test removeprefix() method"

	| s result |
	s := 'hello world'.
	result := s @env1:removeprefix: 'hello '.
	self assert: result equals: 'world'.

	result := s @env1:removeprefix: 'foo'.
	self assert: result equals: 'hello world'.
%

category: 'Grail-String Methods'
method: StrTestCase
testRemovesuffix
	"Test removesuffix() method"

	| s result |
	s := 'hello world'.
	result := s @env1:removesuffix: ' world'.
	self assert: result equals: 'hello'.

	result := s @env1:removesuffix: 'foo'.
	self assert: result equals: 'hello world'.
%

category: 'Grail-String Methods'
method: StrTestCase
testReplace
	"Test replace() method"

	| s result |
	s := 'hello world'.
	result := s @env1:replace: 'world' _: 'there'.
	self assert: result equals: 'hello there'.
%

category: 'Grail-String Methods'
method: StrTestCase
testRfind
	"Test rfind() method"

	| s result |
	s := 'hello world hello'.
	result := s @env1:rfind: 'hello'.
	self assert: result equals: 12.

	result := s @env1:rfind: 'xyz'.
	self assert: result equals: -1.
%

category: 'Grail-String Methods'
method: StrTestCase
testRindex
	"Test rindex() method"

	| s result |
	s := 'hello world hello'.
	result := s @env1:rindex: 'hello'.
	self assert: result equals: 12.
%

category: 'Grail-String Methods'
method: StrTestCase
testRjust
	"Test rjust() method"

	| s result |
	s := 'hi'.
	result := s @env1:rjust: 10.
	self assert: result size equals: 10.
	self assert: (result endsWith: 'hi') equals: true.
%

category: 'Grail-String Methods'
method: StrTestCase
testRpartition
	"Test rpartition() method"

	| s result |
	s := 'hello world foo'.
	result := s @env1:rpartition: ' '.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 'hello world'.
	self assert: (result at: 2) equals: ' '.
	self assert: (result at: 3) equals: 'foo'.
%

category: 'Grail-String Methods'
method: StrTestCase
testRstrip
	"Test rstrip() method"

	| s result |
	s := '  hello  '.
	result := s @env1:rstrip.
	self assert: result equals: '  hello'.
%

category: 'Grail-String Methods'
method: StrTestCase
testSplit
	"Test split() method"

	| s result |
	s := 'hello world foo'.
	result := s @env1:split.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 'hello'.
	self assert: (result at: 2) equals: 'world'.
	self assert: (result at: 3) equals: 'foo'.
%

category: 'Grail-String Methods'
method: StrTestCase
testSplitReturnsStrClass
	"Regression: split / split(sep) substrings must be the Python str
	class (Unicode7), not a plain GemStone String — a plain String
	fails ``isinstance(x, str)'' downstream (broke
	urllib.parse.unquote on query-string parsing / req.args)."

	self assert: (('a&b&c' @env1:split: '&') first class) equals: Unicode7.
	self assert: (('a&b&c' @env1:split: '&') last class) equals: Unicode7.
	self assert: (('one two' @env1:split) first class) equals: Unicode7.
	"Content is still correct."
	self assert: ('a&b&c' @env1:split: '&') equals: #('a' 'b' 'c') asOrderedCollection
%

category: 'Grail-String Methods'
method: StrTestCase
testSplitlines
	"Test splitlines() method"

	| s result |
	s := 'hello
world'.
	result := s @env1:splitlines.
	self assert: result size equals: 2.
	self assert: (result at: 1) equals: 'hello'.
	self assert: (result at: 2) equals: 'world'.
%

category: 'Grail-String Methods'
method: StrTestCase
testStartswith
	"Test startswith() method"

	| s result |
	s := 'hello world'.
	result := s @env1:startswith: 'hello'.
	self assert: result equals: true.

	result := s @env1:startswith: 'world'.
	self assert: result equals: false.
%

category: 'Grail-String Methods'
method: StrTestCase
testStrip
	"Test strip() method"

	| s result |
	s := '  hello  '.
	result := s @env1:strip.
	self assert: result equals: 'hello'.
%

category: 'Grail-String Methods'
method: StrTestCase
testStripWithChars
	"str.strip(chars) strips any character in chars from both ends.
	None means whitespace (matches str.strip()).  Required by jinja2's
	|trim filter which calls .strip(chars) with chars=None as the
	@pass_eval_context default."

	self assert: ('xxhelloxx' @env1:strip: 'x') equals: 'hello'.
	self assert: ('  hi  ' @env1:strip: None) equals: 'hi'.
	self assert: ('++--abc++' @env1:strip: '+-') equals: 'abc'.
	self assert: ('hello' @env1:strip: '') equals: 'hello'.
	self assert: ('aaa' @env1:strip: 'a') equals: ''
%

category: 'Grail-String Methods'
method: StrTestCase
testFormatBasic
	"str.format() — auto-indexed and explicit-indexed positional fields."

	self assert: ('{} world' perform: #'_format:kw:' env: 1
		withArguments: { #('hello'). nil }) equals: 'hello world'.
	self assert: ('{0} {1} {0}' perform: #'_format:kw:' env: 1
		withArguments: { #('a' 'b'). nil }) equals: 'a b a'
%

category: 'Grail-String Methods'
method: StrTestCase
testFormatSpec
	"str.format() with [fill]align[width] spec subset.  Right-/left-/
	center-alignment, default and explicit fill character."

	self assert: ('{:>4}' perform: #'_format:kw:' env: 1
		withArguments: { #(42). nil }) equals: '  42'.
	self assert: ('{:<4}' perform: #'_format:kw:' env: 1
		withArguments: { #(42). nil }) equals: '42  '.
	self assert: ('{:^5}' perform: #'_format:kw:' env: 1
		withArguments: { #('hi'). nil }) equals: ' hi  '.
	self assert: ('{0:*>5}' perform: #'_format:kw:' env: 1
		withArguments: { #(42). nil }) equals: '***42'
%

category: 'Grail-String Methods'
method: StrTestCase
testFormatKeyword
	"str.format() with keyword fields."

	| kw |
	kw := KeyValueDictionary new.
	kw at: 'name' put: 'Alice'.
	self assert: ('Hello, {name}!' perform: #'_format:kw:' env: 1
		withArguments: { #(). kw }) equals: 'Hello, Alice!'
%

category: 'Grail-String Methods'
method: StrTestCase
testFormatConversion
	"str.format() with !r conversion flag — applies __repr__."

	self assert: ('{0}={1!r}' perform: #'_format:kw:' env: 1
		withArguments: { #('x' 'y'). nil }) equals: 'x=''y'''
%

category: 'Grail-String Methods'
method: StrTestCase
testFormatBraceEscapes
	"``{{'' / ``}}'' are literal-brace escapes in str.format().  No
	field substitution should run when both braces are doubled —
	common idiom for emitting JSON-like literals from format strings."

	self assert: ('{{}}' perform: #'_format:kw:' env: 1
		withArguments: { #(). nil }) equals: '{}'.
	self assert: ('{{{0}}}' perform: #'_format:kw:' env: 1
		withArguments: { #('x'). nil }) equals: '{x}'.
	self assert: ('a {{ b }} c' perform: #'_format:kw:' env: 1
		withArguments: { #(). nil }) equals: 'a { b } c'
%

category: 'Grail-String Methods'
method: StrTestCase
testFormatNoArgs
	"format() unary form on a literal with no placeholders is a
	no-op that returns self.  Doubled-brace escapes still collapse."

	self assert: 'plain text' @env1:format equals: 'plain text'.
	self assert: '' @env1:format equals: ''.
	self assert: '{{escaped}}' @env1:format equals: '{escaped}'
%

category: 'Grail-String Methods'
method: StrTestCase
testIntFormatSpec
	"``int.__format__'' direct invocation — empty spec returns
	__str__, non-empty spec routes through the shared
	[fill][<|>|^][width] helper.  Covers the integer-input path
	independent of str.format's field-parsing."

	self assert: (42 @env1:__format__: '') equals: '42'.
	self assert: (42 @env1:__format__: '>4') equals: '  42'.
	self assert: (42 @env1:__format__: '<4') equals: '42  '.
	self assert: (7 @env1:__format__: '*>3') equals: '**7'.
	self assert: (5 @env1:__format__: '^5') equals: '  5  '
%

category: 'Grail-String Methods'
method: StrTestCase
testSwapcase
	"Test swapcase() method"

	| s result |
	s := 'Hello World'.
	result := s @env1:swapcase.
	self assert: result equals: 'hELLO wORLD'.
%

category: 'Grail-String Methods'
method: StrTestCase
testTitle
	"Test title() method"

	| s result |
	s := 'hello world'.
	result := s @env1:title.
	self assert: result equals: 'Hello World'.
%

category: 'Grail-String Methods'
method: StrTestCase
testUpper
	"Test upper() method"

	| s result |
	s := 'hello'.
	result := s @env1:upper.
	self assert: result equals: 'HELLO'.
%

category: 'Grail-String Methods'
method: StrTestCase
testZfill
	"Test zfill() method"

	| s result |
	s := '42'.
	result := s @env1:zfill: 5.
	self assert: result equals: '00042'.

	s := '-42'.
	result := s @env1:zfill: 5.
	self assert: result equals: '-0042'.
%

category: 'Grail-String Methods'
method: StrTestCase
testEncodeLatin1
	"``s.encode('latin1')'' is the WSGI byte-smuggling standard
	required by werkzeug._internal's encoding dance.  Pre-fix, the
	latin1 path hit a broken ``LookupError ___isKindOf___:
	NotImplementedError'' check (sending an env-1 dunder to a class
	object, MNU) — the test demonstrates the latin1 codec produces
	ASCII-equivalent bytes for codepoints 0..127."

	| result |
	result := 'hello' @env1:encode: 'latin1'.
	self assert: result class equals: ByteArray.
	self assert: result size equals: 5.
	self assert: (result at: 1) equals: $h asInteger
%

category: 'Grail-String Methods'
method: StrTestCase
testEncodeLatin1RoundTrip
	"latin1 encode then decode round-trips ASCII strings — the WSGI
	idiom used by werkzeug._internal._wsgi_decoding_dance."

	| encoded decoded |
	encoded := 'hello world' @env1:encode: 'latin1'.
	decoded := encoded @env1:decode: 'latin1'.
	self assert: decoded equals: 'hello world'
%

category: 'Grail-String Methods'
method: StrTestCase
testEncodeUnknownEncodingRaisesLookupError
	"An unsupported encoding name raises LookupError (CPython
	matches; Grail previously raised ValueError or hit the broken
	isKindOf dispatch).  ``codepage1252'' is not in the supported set."

	self should: [
		'hello' @env1:encode: 'codepage1252'
	] raise: LookupError
%

category: 'Grail-Initialization'
method: StrTestCase
testStrFromBytesWithEncoding
	"``str(bytes_obj, 'utf-8')'' — 2-arg constructor form used by
	werkzeug.http for header decoding.  Before the fix,
	CharacterCollection class had ``__new__:'' only (single arg);
	the 2-arg call hit MNU.  Now delegates to ByteArray>>decode:."

	| b s |
	b := bytes @env1:__new__: 'hello' _: 'ascii'.
	s := str @env1:__new__: b _: 'utf-8'.
	self assert: s equals: 'hello'.
	"latin1 round-trip — WSGI's standard byte-smuggling encoding."
	s := str @env1:__new__: b _: 'latin1'.
	self assert: s equals: 'hello'
%

category: 'Grail-Initialization'
method: StrTestCase
testStrFromStrWithEncodingRaisesTypeError
	"CPython rejects ``str(some_str, encoding)'' with TypeError
	(``decoding str is not supported'').  Grail matches the shape."

	self should: [
		str @env1:__new__: 'hello' _: 'utf-8'
	] raise: TypeError
%

category: 'Grail-String Methods'
method: StrTestCase
testFindWithStartArg
	"``s.find(sub, start)'' searches from ``start'' (0-based) onward
	and returns an absolute index, or -1 on miss."

	self assert: ('a/b/c' @env1:find: '/' _: 0) equals: 1.
	self assert: ('a/b/c' @env1:find: '/' _: 2) equals: 3.
	self assert: ('a/b/c' @env1:find: '/' _: 4) equals: -1.
	"A start at the match still finds it."
	self assert: ('a/b/c' @env1:find: '/' _: 3) equals: 3
%

category: 'Grail-String Methods'
method: StrTestCase
testFindWithStartAndStopArgs
	"``s.find(sub, start, stop)'' restricts the search to [start, stop)."

	self assert: ('hello world' @env1:find: 'o' _: 0 _: 5) equals: 4.
	"'o' at index 4 is outside [0, 4)."
	self assert: ('hello world' @env1:find: 'o' _: 0 _: 4) equals: -1.
	"Second 'o' (index 7) found when the window reaches it."
	self assert: ('hello world' @env1:find: 'o' _: 5 _: 11) equals: 7
%

category: 'Grail-String Methods'
method: StrTestCase
testFindNegativeIndices
	"Negative start / stop count from the end, like CPython slices."

	self assert: ('hello' @env1:find: 'l' _: -2) equals: 3.
	"start clamps to 0 when very negative."
	self assert: ('hello' @env1:find: 'l' _: -100) equals: 2.
	"Negative stop: search [0, len-1)."
	self assert: ('hello' @env1:find: 'o' _: 0 _: -1) equals: -1.
	self assert: ('hello' @env1:find: 'l' _: 0 _: -1) equals: 2
%

category: 'Grail-String Methods'
method: StrTestCase
testFindEdgeCases
	"Out-of-range start, and the empty-substring rule."

	"start past the end → miss for a non-empty needle."
	self assert: ('hello' @env1:find: 'h' _: 99) equals: -1.
	"Empty substring matches at the (clamped) start position."
	self assert: ('hello' @env1:find: '' _: 2) equals: 2.
	self assert: ('hello' @env1:find: '' _: 5) equals: 5.
	"Empty substring past the end → -1 (CPython)."
	self assert: ('hello' @env1:find: '' _: 6) equals: -1
%

category: 'Grail-String Methods'
method: StrTestCase
testFindKwargsDispatch
	"``_find:kw:'' varargs entry routes by positional arity so a
	statically-unresolved call still reaches the right form."

	self assert: ('a/b/c' @env1:_find: #('/') kw: nil) equals: 1.
	self assert: ('a/b/c' @env1:_find: #('/' 2) kw: nil) equals: 3.
	self assert: ('hello world' @env1:_find: #('o' 0 5) kw: nil) equals: 4.
	self should: [
		'abc' @env1:_find: #('a' 0 1 9) kw: nil
	] raise: TypeError
%

category: 'Grail-Tests - splitlines'
method: StrTestCase
testSplitlinesPreservesEmptyLines
	"splitlines() preserves empty lines (unlike the old subStrings: form)
	and drops the terminators."

	| lf r |
	lf := String with: Character lf.
	r := ('a', lf, lf, 'b') @env1:splitlines.
	self assert: r size equals: 3.
	self assert: (r at: 1) equals: 'a'.
	self assert: (r at: 2) equals: ''.
	self assert: (r at: 3) equals: 'b'.
%

category: 'Grail-Tests - splitlines'
method: StrTestCase
testSplitlinesCRLFAndTrailing
	"splitlines() treats CR+LF as a single boundary and yields no extra
	empty line after a trailing terminator."

	| cr lf r |
	cr := String with: Character cr.
	lf := String with: Character lf.
	r := ('a', cr, lf, 'b', lf) @env1:splitlines.
	self assert: r size equals: 2.
	self assert: (r at: 1) equals: 'a'.
	self assert: (r at: 2) equals: 'b'.
%

category: 'Grail-Tests - splitlines'
method: StrTestCase
testSplitlinesKeepends
	"splitlines(True) retains each line's terminator."

	| lf r |
	lf := String with: Character lf.
	r := ('a', lf, 'b') @env1:splitlines: true.
	self assert: r size equals: 2.
	self assert: (r at: 1) equals: ('a', lf).
	self assert: (r at: 2) equals: 'b'.
%

category: 'Grail-Tests - expandtabs'
method: StrTestCase
testExpandtabsColumnAware
	"expandtabs(n) expands each tab to the next multiple of n columns
	(column-aware), not a blind replace."

	| tab |
	tab := String with: Character tab.
	self assert: (('a', tab, 'b') @env1:expandtabs: 4) equals: 'a   b'.
	self assert: (('ab', tab, 'c') @env1:expandtabs: 4) equals: 'ab  c'.
	self assert: (tab @env1:expandtabs: 8) equals: '        '.
%

category: 'Grail-Tests - split'
method: StrTestCase
testSplitReturnsPythonList
	"str.split() must answer the canonical Python list surrogate
	(OrderedCollection), not the Array subStrings produces: an Array
	broke `text.split() == wrap(...)` comparisons and would reject
	append.  Also regresses cross-kind sequence __eq__ (Array vs
	OrderedCollection compare by content; tuple stays distinct)."

	| r |
	r := 'a b c' @env1:split.
	self assert: (r isKindOf: OrderedCollection).
	self assert: (self eval: '"a b".split() == ["a", "b"]').
	self assert: (self eval: '(1,) == [1]') equals: false.
	self assert: (self eval: '[1] == (1,)') equals: false
%

category: 'Grail-Tests - escapes'
method: StrTestCase
testNamedUnicodeEscape
	"\N{NAME} escapes resolve through the curated name table; the
	character lands in the literal (regresses the tokenizer keeping
	the raw backslash-N text, which silently corrupted literals)."

	self assert: (self eval: 'len("a\N{NO-BREAK SPACE}b")') equals: 3.
	self assert: (self eval: 'ord("\N{NARROW NO-BREAK SPACE}")') equals: 8239.
	self assert: (self eval: 'ord("\N{EM DASH}")') equals: 8212
%

category: 'Grail-Tests - escapes'
method: StrTestCase
testUnknownUnicodeNameRaises
	"An unknown \N name is a SyntaxError (CPython semantics), not a
	silently-kept raw escape."

	self should: [self eval: '"\N{NOT A REAL NAME XYZZY}"']
		raise: SyntaxError
%

category: 'Grail-Tests - escapes'
method: StrTestCase
testCapitalUEscape
	"\UXXXXXXXX eight-hex-digit escapes decode (supplementary planes)."

	self assert: (self eval: 'ord("\U0001F600")') equals: 128512.
	self assert: (self eval: 'ord("\U000000E4")') equals: 228
%

category: 'Grail-Tests - format'
method: StrTestCase
testFormatMap
	"str.format_map(mapping) resolves keyword fields through the
	mapping's __getitem__ (previously a 'Not yet implemented' stub;
	CPython test_re formats through a regex Match this way)."

	| d |
	d := self eval: '{"a": 1, "b": "x"}'.
	self assert: ('{a}-{b}' @env1:format_map: d) equals: '1-x'.
	self should: [('{missing}' @env1:format_map: d)] raise: KeyError
%

category: 'Grail-Tests - escapes'
method: StrTestCase
testUnicodeEscapeEncode
	"str.encode('unicode_escape') backslash-escapes non-ASCII with
	correctly padded hex (printStringRadix:showRadix:, not the absent
	printString: -- a 0xB5 char must become the four bytes of
	backslash-x-b-5)."

	| s enc |
	s := String new.
	s add: (Character codePoint: 181).   "MICRO SIGN"
	enc := s @env1:encode: 'unicode_escape'.
	self assert: (enc @env1:__len__) equals: 4.
	self assert: (enc at: 1) equals: 92.
	self assert: (enc at: 2) equals: 120.
	self assert: (enc at: 3) equals: 98.
	self assert: (enc at: 4) equals: 53
%

category: 'Grail-Tests - escapes'
method: StrTestCase
testNamedEscapeCapitalDiaeresis
	"\N{LATIN CAPITAL LETTER A WITH DIAERESIS} resolves through the
	tokenizer's curated name table (vendored test/re_tests.py has it in
	an ordinary literal, so import died with SyntaxError before)."

	| s |
	s := self eval: '"\N{LATIN CAPITAL LETTER A WITH DIAERESIS}"'.
	self assert: (s @env1:__len__) equals: 1.
	self assert: (s at: 1) codePoint equals: 16rC4
%
