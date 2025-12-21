! ------------------- Remove existing behavior from StrTestCase
expectvalue /Metaclass3
doit
StrTestCase removeAllMethods.
StrTestCase class removeAllMethods.
%

! ------------------- Class methods for StrTestCase
set compile_env: 0

! ------------------- Instance methods for StrTestCase
set compile_env: 0

category: 'Python-Initialization'
method: StrTestCase
test__new__WithNil
	"Test that str(None) returns empty string"

	| result |
	result := str perform: #__new__: env: 2 withArguments: { nil }.
	self assert: result equals: ''.
%

category: 'Python-Initialization'
method: StrTestCase
test__new__WithString
	"Test that str('hello') returns the same string"

	| result |
	result := str perform: #__new__: env: 2 withArguments: { 'hello' }.
	self assert: result equals: 'hello'.
%

category: 'Python-String Operations'
method: StrTestCase
test__add__
	"Test string concatenation with +"

	| s1 s2 result |
	s1 := 'hello'.
	s2 := ' world'.
	result := s1 perform: #__add__: env: 2 withArguments: { s2 }.
	self assert: result equals: 'hello world'.
%

category: 'Python-String Operations'
method: StrTestCase
test__mul__
	"Test string repetition with *"

	| s result |
	s := 'ab'.
	result := s perform: #__mul__: env: 2 withArguments: { 3 }.
	self assert: result equals: 'ababab'.
%

category: 'Python-String Operations'
method: StrTestCase
test__mul__Zero
	"Test string repetition with 0"

	| s result |
	s := 'ab'.
	result := s perform: #__mul__: env: 2 withArguments: { 0 }.
	self assert: result equals: ''.
%

category: 'Python-String Operations'
method: StrTestCase
test__rmul__
	"Test reverse string repetition"

	| s result |
	s := 'ab'.
	result := s perform: #__rmul__: env: 2 withArguments: { 3 }.
	self assert: result equals: 'ababab'.
%

category: 'Python-Comparison'
method: StrTestCase
test__eq__
	"Test string equality"

	| s1 s2 result |
	s1 := 'hello'.
	s2 := 'hello'.
	result := s1 perform: #__eq__: env: 2 withArguments: { s2 }.
	self assert: result equals: true.
%

category: 'Python-Comparison'
method: StrTestCase
test__ne__
	"Test string inequality"

	| s1 s2 result |
	s1 := 'hello'.
	s2 := 'world'.
	result := s1 perform: #__ne__: env: 2 withArguments: { s2 }.
	self assert: result equals: true.
%

category: 'Python-Comparison'
method: StrTestCase
test__lt__
	"Test string less than"

	| s1 s2 result |
	s1 := 'apple'.
	s2 := 'banana'.
	result := s1 perform: #__lt__: env: 2 withArguments: { s2 }.
	self assert: result equals: true.
%

category: 'Python-Comparison'
method: StrTestCase
test__le__
	"Test string less than or equal"

	| s1 s2 result |
	s1 := 'apple'.
	s2 := 'apple'.
	result := s1 perform: #__le__: env: 2 withArguments: { s2 }.
	self assert: result equals: true.
%

category: 'Python-Comparison'
method: StrTestCase
test__gt__
	"Test string greater than"

	| s1 s2 result |
	s1 := 'banana'.
	s2 := 'apple'.
	result := s1 perform: #__gt__: env: 2 withArguments: { s2 }.
	self assert: result equals: true.
%

category: 'Python-Comparison'
method: StrTestCase
test__ge__
	"Test string greater than or equal"

	| s1 s2 result |
	s1 := 'banana'.
	s2 := 'banana'.
	result := s1 perform: #__ge__: env: 2 withArguments: { s2 }.
	self assert: result equals: true.
%

category: 'Python-Sequence Operations'
method: StrTestCase
test__len__
	"Test string length"

	| s result |
	s := 'hello'.
	result := s perform: #__len__ env: 2.
	self assert: result equals: 5.
%

category: 'Python-Sequence Operations'
method: StrTestCase
test__contains__
	"Test substring containment"

	| s result |
	s := 'hello world'.
	result := s perform: #__contains__: env: 2 withArguments: { 'world' }.
	self assert: result equals: true.

	result := s perform: #__contains__: env: 2 withArguments: { 'xyz' }.
	self assert: result equals: false.
%

category: 'Python-String Representation'
method: StrTestCase
test__str__
	"Test __str__ returns self"

	| s result |
	s := 'hello'.
	result := s perform: #__str__ env: 2.
	self assert: result equals: s.
%

category: 'Python-String Representation'
method: StrTestCase
test__repr__
	"Test __repr__ adds quotes"

	| s result |
	s := 'hello'.
	result := s perform: #__repr__ env: 2.
	self assert: result equals: '''hello'''.
%

category: 'Python-String Representation'
method: StrTestCase
test__repr__WithApostrophe
	"Test __repr__ escapes apostrophes"

	| s result |
	s := 'it''s'.
	result := s perform: #__repr__ env: 2.
	self assert: result equals: '''it\''s'''.
%

category: 'Python-Hashing & Identity'
method: StrTestCase
test__hash__
	"Test that __hash__ returns a hash value"

	| s result |
	s := 'hello'.
	result := s perform: #__hash__ env: 2.
	self assert: result class equals: SmallInteger.
%

category: 'Python-String Methods'
method: StrTestCase
testUpper
	"Test upper() method"

	| s result |
	s := 'hello'.
	result := s perform: #upper env: 2.
	self assert: result equals: 'HELLO'.
%

category: 'Python-String Methods'
method: StrTestCase
testLower
	"Test lower() method"

	| s result |
	s := 'HELLO'.
	result := s perform: #lower env: 2.
	self assert: result equals: 'hello'.
%

category: 'Python-String Methods'
method: StrTestCase
testCapitalize
	"Test capitalize() method"

	| s result |
	s := 'hello world'.
	result := s perform: #capitalize env: 2.
	self assert: result equals: 'Hello world'.
%

category: 'Python-String Methods'
method: StrTestCase
testStrip
	"Test strip() method"

	| s result |
	s := '  hello  '.
	result := s perform: #strip env: 2.
	self assert: result equals: 'hello'.
%

category: 'Python-String Methods'
method: StrTestCase
testLstrip
	"Test lstrip() method"

	| s result |
	s := '  hello  '.
	result := s perform: #lstrip env: 2.
	self assert: result equals: 'hello  '.
%

category: 'Python-String Methods'
method: StrTestCase
testRstrip
	"Test rstrip() method"

	| s result |
	s := '  hello  '.
	result := s perform: #rstrip env: 2.
	self assert: result equals: '  hello'.
%

category: 'Python-String Methods'
method: StrTestCase
testStartswith
	"Test startswith() method"

	| s result |
	s := 'hello world'.
	result := s perform: #startswith: env: 2 withArguments: { 'hello' }.
	self assert: result equals: true.

	result := s perform: #startswith: env: 2 withArguments: { 'world' }.
	self assert: result equals: false.
%

category: 'Python-String Methods'
method: StrTestCase
testEndswith
	"Test endswith() method"

	| s result |
	s := 'hello world'.
	result := s perform: #endswith: env: 2 withArguments: { 'world' }.
	self assert: result equals: true.

	result := s perform: #endswith: env: 2 withArguments: { 'hello' }.
	self assert: result equals: false.
%

category: 'Python-String Methods'
method: StrTestCase
testFind
	"Test find() method"

	| s result |
	s := 'hello world'.
	result := s perform: #find: env: 2 withArguments: { 'world' }.
	self assert: result equals: 6.  "0-based index"

	result := s perform: #find: env: 2 withArguments: { 'xyz' }.
	self assert: result equals: -1.
%

category: 'Python-String Methods'
method: StrTestCase
testReplace
	"Test replace() method"

	| s result |
	s := 'hello world'.
	result := s perform: #replace:_: env: 2 withArguments: { 'world'. 'there' }.
	self assert: result equals: 'hello there'.
%

category: 'Python-String Methods'
method: StrTestCase
testSplit
	"Test split() method"

	| s result |
	s := 'hello world foo'.
	result := s perform: #split env: 2.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 'hello'.
	self assert: (result at: 2) equals: 'world'.
	self assert: (result at: 3) equals: 'foo'.
%

category: 'Python-String Methods'
method: StrTestCase
testJoin
	"Test join() method"

	| sep parts result |
	sep := ', '.
	parts := #('apple' 'banana' 'cherry').
	result := sep perform: #join: env: 2 withArguments: { parts }.
	self assert: result equals: 'apple, banana, cherry'.
%

category: 'Python-String Methods'
method: StrTestCase
testCount
	"Test count() method"

	| s result |
	s := 'hello world'.
	result := s perform: #count: env: 2 withArguments: { 'l' }.
	self assert: result equals: 3.

	result := s perform: #count: env: 2 withArguments: { 'o' }.
	self assert: result equals: 2.

	result := s perform: #count: env: 2 withArguments: { 'xyz' }.
	self assert: result equals: 0.
%

category: 'Python-String Methods'
method: StrTestCase
testIndex
	"Test index() method"

	| s result |
	s := 'hello world'.
	result := s perform: #index: env: 2 withArguments: { 'world' }.
	self assert: result equals: 6.
%

category: 'Python-String Methods'
method: StrTestCase
testRfind
	"Test rfind() method"

	| s result |
	s := 'hello world hello'.
	result := s perform: #rfind: env: 2 withArguments: { 'hello' }.
	self assert: result equals: 12.

	result := s perform: #rfind: env: 2 withArguments: { 'xyz' }.
	self assert: result equals: -1.
%

category: 'Python-String Methods'
method: StrTestCase
testRindex
	"Test rindex() method"

	| s result |
	s := 'hello world hello'.
	result := s perform: #rindex: env: 2 withArguments: { 'hello' }.
	self assert: result equals: 12.
%

category: 'Python-String Methods'
method: StrTestCase
testSwapcase
	"Test swapcase() method"

	| s result |
	s := 'Hello World'.
	result := s perform: #swapcase env: 2.
	self assert: result equals: 'hELLO wORLD'.
%

category: 'Python-String Methods'
method: StrTestCase
testTitle
	"Test title() method"

	| s result |
	s := 'hello world'.
	result := s perform: #title env: 2.
	self assert: result equals: 'Hello World'.
%

category: 'Python-String Methods'
method: StrTestCase
testCasefold
	"Test casefold() method"

	| s result |
	s := 'HELLO'.
	result := s perform: #casefold env: 2.
	self assert: result equals: 'hello'.
%

category: 'Python-String Methods'
method: StrTestCase
testCenter
	"Test center() method"

	| s result |
	s := 'hi'.
	result := s perform: #center: env: 2 withArguments: { 10 }.
	self assert: result size equals: 10.
	self assert: result trimBoth equals: 'hi'.
%

category: 'Python-String Methods'
method: StrTestCase
testLjust
	"Test ljust() method"

	| s result |
	s := 'hi'.
	result := s perform: #ljust: env: 2 withArguments: { 10 }.
	self assert: result size equals: 10.
	self assert: (result beginsWith: 'hi') equals: true.
%

category: 'Python-String Methods'
method: StrTestCase
testRjust
	"Test rjust() method"

	| s result |
	s := 'hi'.
	result := s perform: #rjust: env: 2 withArguments: { 10 }.
	self assert: result size equals: 10.
	self assert: (result endsWith: 'hi') equals: true.
%

category: 'Python-String Methods'
method: StrTestCase
testZfill
	"Test zfill() method"

	| s result |
	s := '42'.
	result := s perform: #zfill: env: 2 withArguments: { 5 }.
	self assert: result equals: '00042'.

	s := '-42'.
	result := s perform: #zfill: env: 2 withArguments: { 5 }.
	self assert: result equals: '-0042'.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIsalnum
	"Test isalnum() method"

	| s result |
	s := 'hello123'.
	result := s perform: #isalnum env: 2.
	self assert: result equals: true.

	s := 'hello 123'.
	result := s perform: #isalnum env: 2.
	self assert: result equals: false.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIsalpha
	"Test isalpha() method"

	| s result |
	s := 'hello'.
	result := s perform: #isalpha env: 2.
	self assert: result equals: true.

	s := 'hello123'.
	result := s perform: #isalpha env: 2.
	self assert: result equals: false.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIsdigit
	"Test isdigit() method"

	| s result |
	s := '123'.
	result := s perform: #isdigit env: 2.
	self assert: result equals: true.

	s := '123abc'.
	result := s perform: #isdigit env: 2.
	self assert: result equals: false.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIslower
	"Test islower() method"

	| s result |
	s := 'hello'.
	result := s perform: #islower env: 2.
	self assert: result equals: true.

	s := 'Hello'.
	result := s perform: #islower env: 2.
	self assert: result equals: false.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIsupper
	"Test isupper() method"

	| s result |
	s := 'HELLO'.
	result := s perform: #isupper env: 2.
	self assert: result equals: true.

	s := 'Hello'.
	result := s perform: #isupper env: 2.
	self assert: result equals: false.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIsspace
	"Test isspace() method"

	| s result |
	s := '   '.
	result := s perform: #isspace env: 2.
	self assert: result equals: true.

	s := '  a  '.
	result := s perform: #isspace env: 2.
	self assert: result equals: false.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIstitle
	"Test istitle() method"

	| s result |
	s := 'Hello World'.
	result := s perform: #istitle env: 2.
	self assert: result equals: true.

	s := 'Hello world'.
	result := s perform: #istitle env: 2.
	self assert: result equals: false.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIsascii
	"Test isascii() method"

	| s result |
	s := 'hello'.
	result := s perform: #isascii env: 2.
	self assert: result equals: true.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIsdecimal
	"Test isdecimal() method"

	| s result |
	s := '123'.
	result := s perform: #isdecimal env: 2.
	self assert: result equals: true.

	s := '123abc'.
	result := s perform: #isdecimal env: 2.
	self assert: result equals: false.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIsnumeric
	"Test isnumeric() method"

	| s result |
	s := '123'.
	result := s perform: #isnumeric env: 2.
	self assert: result equals: true.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIsidentifier
	"Test isidentifier() method"

	| s result |
	s := 'hello_world'.
	result := s perform: #isidentifier env: 2.
	self assert: result equals: true.

	s := '123abc'.
	result := s perform: #isidentifier env: 2.
	self assert: result equals: false.
%

category: 'Python-String Test Methods'
method: StrTestCase
testIsprintable
	"Test isprintable() method"

	| s result |
	s := 'hello'.
	result := s perform: #isprintable env: 2.
	self assert: result equals: true.
%

category: 'Python-String Methods'
method: StrTestCase
testSplitlines
	"Test splitlines() method"

	| s result |
	s := 'hello
world'.
	result := s perform: #splitlines env: 2.
	self assert: result size equals: 2.
	self assert: (result at: 1) equals: 'hello'.
	self assert: (result at: 2) equals: 'world'.
%

category: 'Python-String Methods'
method: StrTestCase
testPartition
	"Test partition() method"

	| s result |
	s := 'hello world'.
	result := s perform: #partition: env: 2 withArguments: { ' ' }.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 'hello'.
	self assert: (result at: 2) equals: ' '.
	self assert: (result at: 3) equals: 'world'.
%

category: 'Python-String Methods'
method: StrTestCase
testRpartition
	"Test rpartition() method"

	| s result |
	s := 'hello world foo'.
	result := s perform: #rpartition: env: 2 withArguments: { ' ' }.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 'hello world'.
	self assert: (result at: 2) equals: ' '.
	self assert: (result at: 3) equals: 'foo'.
%

category: 'Python-String Methods'
method: StrTestCase
testRemoveprefix
	"Test removeprefix() method"

	| s result |
	s := 'hello world'.
	result := s perform: #removeprefix: env: 2 withArguments: { 'hello ' }.
	self assert: result equals: 'world'.

	result := s perform: #removeprefix: env: 2 withArguments: { 'foo' }.
	self assert: result equals: 'hello world'.
%

category: 'Python-String Methods'
method: StrTestCase
testRemovesuffix
	"Test removesuffix() method"

	| s result |
	s := 'hello world'.
	result := s perform: #removesuffix: env: 2 withArguments: { ' world' }.
	self assert: result equals: 'hello'.

	result := s perform: #removesuffix: env: 2 withArguments: { 'foo' }.
	self assert: result equals: 'hello world'.
%

category: 'Python-String Methods'
method: StrTestCase
testExpandtabs
	"Test expandtabs() method"

	| s result |
	s := 'hello	world'.
	result := s perform: #expandtabs env: 2.
	self assert: (result includesString: '	') equals: false.
%


