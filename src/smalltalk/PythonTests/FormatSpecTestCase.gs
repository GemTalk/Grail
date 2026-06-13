! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FormatSpecTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FormatSpecTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
FormatSpecTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
FormatSpecTestCase removeAllMethods: 0.
FormatSpecTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - int specs'
method: FormatSpecTestCase
testIntRadixTypes
	"Regression: type codes used to be silently ignored
	(format(255, 'x') answered '255')."

	| result |
	result := self eval: '(format(255, "x"), format(255, "X"), format(255, "#x"),
 format(255, "#o"), format(255, "_b")) == ("ff", "FF", "0xff", "0o377", "1111_1111")'.
	self assert: result
%

category: 'Grail-Tests - int specs'
method: FormatSpecTestCase
testIntSignWidthZeroPad
	| result |
	result := self eval: '(format(42, "05d"), format(42, "+d"), format(-42, "05d"),
 format(42, " d"), format(7, "3d"), format(255, "08x")) == ("00042", "+42", "-0042", " 42", "  7", "000000ff")'.
	self assert: result
%

category: 'Grail-Tests - int specs'
method: FormatSpecTestCase
testIntGroupingAndChar
	| result |
	result := self eval: '(format(1234567, ","), format(65, "c")) == ("1,234,567", "A")'.
	self assert: result
%

category: 'Grail-Tests - float specs'
method: FormatSpecTestCase
testFloatFixedPoint
	"Regression: a precision spec used to crash with an UNCATCHABLE
	Smalltalk MessageNotUnderstood."

	| result |
	result := self eval: '(format(3.14159, ".2f"), format(2.0, ".4f"),
 format(-3.14159, "+.3f"), format(1234.5678, "10.2f"), format(1234.5678, ",.2f")) == ("3.14", "2.0000", "-3.142", "   1234.57", "1,234.57")'.
	self assert: result
%

category: 'Grail-Tests - float specs'
method: FormatSpecTestCase
testFloatSciPercentGeneral
	| result |
	result := self eval: '(format(123456.0, ".2e"), format(0.5, ".1%"),
 format(0.000123456, ".3g"), format(1234567.0, ".3g"), format(12.5, "g")) == ("1.23e+05", "50.0%", "0.000123", "1.23e+06", "12.5")'.
	self assert: result
%

category: 'Grail-Tests - str specs'
method: FormatSpecTestCase
testStrFillAlignTruncate
	| result |
	result := self eval: '("{:*^11}".format("mid"), "{:.3}".format("truncate"),
 "{:>6}".format("hi"), format("hi", "5")) == ("****mid****", "tru", "    hi", "hi   ")'.
	self assert: result
%

category: 'Grail-Tests - str specs'
method: FormatSpecTestCase
testMixedStrFormatTemplate
	"Specs embedded in str.format placeholders alongside plain ones."

	| result |
	result := self eval: '"{} {:>4d} {:6.2f}!".format("a", 7, 2.25) == "a    7   2.25!"'.
	self assert: result
%

category: 'Grail-Tests - errors'
method: FormatSpecTestCase
testInvalidSpecRaisesValueError
	"Bad type code and missing precision digits raise a CATCHABLE
	ValueError (Python-level, not a Smalltalk crash)."

	| result |
	result := self eval: 'try:
    format(5, "Z")
    a = False
except ValueError:
    a = True
try:
    "{:.f}".format(1.0)
    b = False
except ValueError:
    b = True
try:
    format("text", "d")
    c = False
except ValueError:
    c = True
a and b and c'.
	self assert: result
%

category: 'Grail-Tests - int specs'
method: FormatSpecTestCase
testIntWithFloatSpecDelegates
	"CPython allows format(3, '.2f') — int routed through the float
	path."

	| result |
	result := self eval: 'format(3, ".2f") == "3.00"'.
	self assert: result
%
