! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ComplexTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ComplexTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ComplexTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ComplexTestCase - Tests for Python complex Type
! ===============================================================================

set compile_env: 0

! ------------------- Remove existing methods
removeallmethods ComplexTestCase
removeallclassmethods ComplexTestCase

set compile_env: 0

category: 'Grail-Initialization'
method: ComplexTestCase
test___real_imaginary
	"Test Smalltalk-side constructor"

	| c |
	c := complex ___new___: 5 _: 12.
	self assert: c class equals: complex.
	self assert: (c @env1:real) equals: 5.0.
	self assert: (c @env1:imag) equals: 12.0.
%

category: 'Grail-Initialization'
method: ComplexTestCase
testPythonAttrLoadReturnsValue
	"Phase B+1 red light: ``cpx.real'' from Python should return the
	float value, not a BoundMethod.  Before the dynamic-instVar sweep
	of value-type wrappers, ``real'' was a unary method on complex
	with no paired ``real:'' setter — ___pyAttrLoad___ wrapped it as
	a BoundMethod (treating it as a callable method instead of a value
	attribute).  After the sweep, real/imag live in dynamic-instVar
	storage and ___pyAttrLoad___'s top-level probe returns the value
	directly."

	| c |
	c := complex ___new___: 5 _: 12.
	self assert: (c @env1:___pyAttrLoad___: #real) equals: 5.0.
	self assert: (c @env1:___pyAttrLoad___: #imag) equals: 12.0.
%

category: 'Grail-Initialization'
method: ComplexTestCase
testSetattrOverridesRealImag
	"Phase B+1: ``setattr(cpx, 'real', 99)'' from outside writes to
	the same dynamic-instVar storage that __init__ wrote to.  Before
	the sweep, real was a static instVar with a synthesized setter
	(``real:''), but setattr's perform: would target ``real:'' (which
	complex didn't actually define, so setattr fell back to writing
	a dynamic instVar — but reads still came from the static slot,
	so the set was invisible)."

	| c bi |
	c := complex ___new___: 5 _: 12.
	bi := (Python @env0:at: #builtins) @env0:___instance___.
	bi @env1:setattr: c _: 'real' _: 99.0.
	self assert: (c @env1:___pyAttrLoad___: #real) equals: 99.0.
	self assert: (c @env1:real) equals: 99.0.
%

category: 'Grail-Arithmetic'
method: ComplexTestCase
test__abs__
	"Test absolute value (magnitude): |3+4i| = 5"

	| c result |
	c := complex ___new___: 3 _: 4.
	result := c @env1:__abs__.
	self assert: result equals: 5.0.
%

category: 'Grail-Arithmetic'
method: ComplexTestCase
test__add__complex
	"Test adding two complex numbers"

	| c1 c2 result |
	c1 := complex ___new___: 3 _: 4.
	c2 := complex ___new___: 1 _: 2.
	result := c1 @env1:__add__: c2.
	self assert: (result @env1:real) equals: 4.0.
	self assert: (result @env1:imag) equals: 6.0.
%

category: 'Grail-Arithmetic'
method: ComplexTestCase
test__add__real
	"Test adding complex and real number"

	| c result |
	c := complex ___new___: 3 _: 4.
	result := c @env1:__add__: 5.
	self assert: (result @env1:real) equals: 8.0.
	self assert: (result @env1:imag) equals: 4.0.
%

category: 'Grail-Type Conversion'
method: ComplexTestCase
test__bool__nonzero
	"Test __bool__ returns true for non-zero complex"

	| c |
	c := complex ___new___: 3 _: 4.
	self assert: (c @env1:__bool__).
%

category: 'Grail-Type Conversion'
method: ComplexTestCase
test__bool__zero
	"Test __bool__ returns false for zero complex"

	| c |
	c := complex ___new___: 0 _: 0.
	self deny: (c @env1:__bool__).
%

category: 'Grail-Type Conversion'
method: ComplexTestCase
test__complex__
	"Test __complex__ returns self"

	| c result |
	c := complex ___new___: 3 _: 4.
	result := c @env1:__complex__.
	self assert: result equals: c.
%

category: 'Grail-Attribute Access'
method: ComplexTestCase
test__dir__
	"Test that __dir__ returns list of attributes including complex methods"

	| c dirResult |
	c := complex ___new___: 3 _: 4.
	dirResult := c @env1:__dir__.

	"Verify it's an array"
	self assert: dirResult class equals: Array.

	"Verify it includes key complex methods"
	self assert: (dirResult includes: '__add__').
	self assert: (dirResult includes: '__mul__').
	self assert: (dirResult includes: 'conjugate').
	self assert: (dirResult includes: 'real').
	self assert: (dirResult includes: 'imag').

	"Verify it includes inherited methods from object"
	self assert: (dirResult includes: '__dir__').
	self assert: (dirResult includes: '__class__').
%

category: 'Grail-Attribute Access'
method: ComplexTestCase
test__dir__sorted
	"Test that __dir__ returns sorted list"

	| c dirResult |
	c := complex ___new___: 3 _: 4.
	dirResult := c @env1:__dir__.

	"Verify the list is sorted"
	self assert: dirResult first equals: '__abs__'.
%

category: 'Grail-Comparison'
method: ComplexTestCase
test__eq__different_imag
	"Test inequality with different imaginary parts"

	| c1 c2 |
	c1 := complex ___new___: 3 _: 4.
	c2 := complex ___new___: 3 _: 5.
	self deny: (c1 @env1:__eq__: c2).
%

category: 'Grail-Comparison'
method: ComplexTestCase
test__eq__different_real
	"Test inequality with different real parts"

	| c1 c2 |
	c1 := complex ___new___: 3 _: 4.
	c2 := complex ___new___: 5 _: 4.
	self deny: (c1 @env1:__eq__: c2).
%

category: 'Grail-Comparison'
method: ComplexTestCase
test__eq__different_type
	"Test inequality with different type"

	| c |
	c := complex ___new___: 3 _: 4.
	self deny: (c @env1:__eq__: 42).
%

category: 'Grail-Comparison'
method: ComplexTestCase
test__eq__same_values
	"Test equality with same values"

	| c1 c2 |
	c1 := complex ___new___: 3 _: 4.
	c2 := complex ___new___: 3 _: 4.
	self assert: (c1 @env1:__eq__: c2).
%

category: 'Grail-Arithmetic'
method: ComplexTestCase
test__mul__complex
	"Test multiplying two complex numbers: (3+4i)(1+2i) = -5+10i"

	| c1 c2 result |
	c1 := complex ___new___: 3 _: 4.
	c2 := complex ___new___: 1 _: 2.
	result := c1 @env1:__mul__: c2.
	self assert: (result @env1:real) equals: -5.0.
	self assert: (result @env1:imag) equals: 10.0.
%

category: 'Grail-Arithmetic'
method: ComplexTestCase
test__mul__real
	"Test multiplying complex by real number"

	| c result |
	c := complex ___new___: 3 _: 4.
	result := c @env1:__mul__: 2.
	self assert: (result @env1:real) equals: 6.0.
	self assert: (result @env1:imag) equals: 8.0.
%

category: 'Grail-Comparison'
method: ComplexTestCase
test__ne__different_values
	"Test inequality with different values"

	| c1 c2 |
	c1 := complex ___new___: 3 _: 4.
	c2 := complex ___new___: 5 _: 6.
	self assert: (c1 @env1:__ne__: c2).
%

category: 'Grail-Comparison'
method: ComplexTestCase
test__ne__same_values
	"Test inequality returns false for same values"

	| c1 c2 |
	c1 := complex ___new___: 3 _: 4.
	c2 := complex ___new___: 3 _: 4.
	self deny: (c1 @env1:__ne__: c2).
%

category: 'Grail-Arithmetic'
method: ComplexTestCase
test__neg__
	"Test negation of complex number"

	| c result |
	c := complex ___new___: 3 _: 4.
	result := c @env1:__neg__.
	self assert: (result @env1:real) equals: -3.0.
	self assert: (result @env1:imag) equals: -4.0.
%

category: 'Grail-Initialization'
method: ComplexTestCase
test__new__
	"Test that __new__ creates a complex number"

	| c |
	c := complex ___new___: 3 _: 4.
	self assert: c class equals: complex.
	self assert: (c @env1:real) equals: 3.0.
	self assert: (c @env1:imag) equals: 4.0.
%

category: 'Grail-Initialization'
method: ComplexTestCase
test__new__defaults
	"Test that __new__ handles nil arguments with defaults"

	| c |
	c := complex ___new___: nil _: nil.
	self assert: (c @env1:real) equals: 0.0.
	self assert: (c @env1:imag) equals: 0.0.
%

category: 'Grail-Arithmetic'
method: ComplexTestCase
test__pos__
	"Test unary plus returns self"

	| c result |
	c := complex ___new___: 3 _: 4.
	result := c @env1:__pos__.
	self assert: result equals: c.
%

category: 'Grail-Arithmetic'
method: ComplexTestCase
test__pow__positive
	"Test raising to positive integer power: (1+1i)^2 = 2i"

	| c result realPart imagPart |
	c := complex ___new___: 1 _: 1.
	result := c @env1:__pow__: 2.
	realPart := result @env1:real.
	imagPart := result @env1:imag.
	"Check that real part is close to 0.0 (within tolerance for floating point)"
	self assert: realPart abs < 0.0001.
	"Check that imaginary part is close to 2.0"
	self assert: (imagPart - 2.0) abs < 0.0001.
%

category: 'Grail-String Representation'
method: ComplexTestCase
test__repr__negative_imag
	"Test __repr__ with negative imaginary part"
	
	| c repr |
	c := complex ___new___: 3 _: -4.
	repr := c @env1:__repr__.
	self assert: repr equals: '(3.0-4.0j)'.
%

category: 'Grail-String Representation'
method: ComplexTestCase
test__repr__positive_imag
	"Test __repr__ with positive imaginary part"
	
	| c repr |
	c := complex ___new___: 3 _: 4.
	repr := c @env1:__repr__.
	self assert: repr equals: '(3.0+4.0j)'.
%

category: 'Grail-String Representation'
method: ComplexTestCase
test__repr__pure_imaginary
	"Test __repr__ for pure imaginary number"
	
	| c repr |
	c := complex ___new___: 0 _: 5.
	repr := c @env1:__repr__.
	self assert: repr equals: '5.0j'.
%

category: 'Grail-String Representation'
method: ComplexTestCase
test__str__
	"Test that __str__ returns same as __repr__"
	
	| c str repr |
	c := complex ___new___: 3 _: 4.
	str := c @env1:__str__.
	repr := c @env1:__repr__.
	self assert: str equals: repr.
%

category: 'Grail-Arithmetic'
method: ComplexTestCase
test__sub__complex
	"Test subtracting two complex numbers"

	| c1 c2 result |
	c1 := complex ___new___: 5 _: 7.
	c2 := complex ___new___: 2 _: 3.
	result := c1 @env1:__sub__: c2.
	self assert: (result @env1:real) equals: 3.0.
	self assert: (result @env1:imag) equals: 4.0.
%

category: 'Grail-Arithmetic'
method: ComplexTestCase
test__truediv__real
	"Test dividing complex by real number"

	| c result |
	c := complex ___new___: 6 _: 8.
	result := c @env1:__truediv__: 2.
	self assert: (result @env1:real) equals: 3.0.
	self assert: (result @env1:imag) equals: 4.0.
%

category: 'Grail-Numbers'
method: ComplexTestCase
test_conjugate
	"Test complex conjugate"
	
	| c conj |
	c := complex ___new___: 3 _: 4.
	conj := c @env1:conjugate.
	self assert: (conj @env1:real) equals: 3.0.
	self assert: (conj @env1:imag) equals: -4.0.
%

category: 'Grail-Numbers'
method: ComplexTestCase
test_conjugate_negative_imag
	"Test conjugate with negative imaginary part"
	
	| c conj |
	c := complex ___new___: 2 _: -5.
	conj := c @env1:conjugate.
	self assert: (conj @env1:real) equals: 2.0.
	self assert: (conj @env1:imag) equals: 5.0.
%

category: 'Grail-Type Conversion'
method: ComplexTestCase
test_from_number
	"Test class method from_number"

	| c |
	c := complex @env1:from_number: 5.
	self assert: (c @env1:real) equals: 5.0.
	self assert: (c @env1:imag) equals: 0.0.
%

category: 'Grail-Attribute Access'
method: ComplexTestCase
test_imag
	"Test that imag returns the imaginary part"
	
	| c |
	c := complex ___new___: 3 _: 4.
	self assert: (c @env1:imag) equals: 4.0.
%

category: 'Grail-Inheritance'
method: ComplexTestCase
test_inherits_from_object
	"Test that complex inherits from object"

	| superclass |
	superclass := complex superclass.
	self assert: superclass equals: object.
%

category: 'Grail-Edge Cases'
method: ComplexTestCase
test_negative_both
	"Test complex number with both parts negative"

	| c |
	c := complex ___new___: -3 _: -4.
	self assert: (c @env1:real) equals: -3.0.
	self assert: (c @env1:imag) equals: -4.0.
%

category: 'Grail-Edge Cases'
method: ComplexTestCase
test_negative_real
	"Test complex number with negative real part"

	| c |
	c := complex ___new___: -3 _: 4.
	self assert: (c @env1:real) equals: -3.0.
	self assert: (c @env1:imag) equals: 4.0.
%

category: 'Grail-Attribute Access'
method: ComplexTestCase
test_real
	"Test that real returns the real part"
	
	| c |
	c := complex ___new___: 3 _: 4.
	self assert: (c @env1:real) equals: 3.0.
%

category: 'Grail-Edge Cases'
method: ComplexTestCase
test_zero_complex
	"Test complex number with zero real and imaginary parts"

	| c |
	c := complex ___new___: 0 _: 0.
	self assert: (c @env1:real) equals: 0.0.
	self assert: (c @env1:imag) equals: 0.0.
	self assert: (c @env1:__repr__) equals: '0.0j'.
%

category: 'Grail-Tests - Eval - Complex Functions'
method: ComplexTestCase
testEvalComplexAbs
	"Test abs() on complex number via Python source"

	self assert: (self eval: 'abs(3 + 4j)') equals: 5.0.
%

category: 'Grail-Tests - Eval - Complex Arithmetic'
method: ComplexTestCase
testEvalComplexArithmetic
	"Test complex arithmetic via Python source"

	| result |
	result := self eval: '(3 + 4j) + (1 + 2j)'.
	self assert: (result @env1:real) equals: 4.0.
	self assert: (result @env1:imag) equals: 6.0.
%

category: 'Grail-Tests - Eval - Complex Creation'
method: ComplexTestCase
testEvalComplexCreation
	"Test complex number via real + imaginary syntax"

	| result |
	result := self eval: '3 + 4j'.
	self assert: (result isKindOf: complex).
	self assert: (result @env1:real) equals: 3.0.
	self assert: (result @env1:imag) equals: 4.0.
%

category: 'Grail-Tests - Eval - Complex Comparison'
method: ComplexTestCase
testEvalComplexEquality
	"Test complex equality via Python source"

	self assert: (self eval: '(3 + 4j) == (3 + 4j)').
	self assert: (self eval: '(3 + 4j) != (1 + 2j)').
%

category: 'Grail-Tests - Eval - Complex Creation'
method: ComplexTestCase
testEvalComplexLiteral
	"Test complex literal creation via Python source"

	| result |
	result := self eval: '5j'.
	self assert: (result isKindOf: complex).
	self assert: (result @env1:real) equals: 0.0.
	self assert: (result @env1:imag) equals: 5.0.
%

category: 'Grail-Tests - Eval - Complex Arithmetic'
method: ComplexTestCase
testEvalComplexMultiplication
	"Test complex multiplication via Python source"

	| result |
	result := self eval: '(2 + 3j) * 2'.
	self assert: (result @env1:real) equals: 4.0.
	self assert: (result @env1:imag) equals: 6.0.
%

category: 'Grail-Tests - Eval - Complex Arithmetic'
method: ComplexTestCase
testEvalComplexNegation
	"Test complex negation via Python source"

	| result |
	result := self eval: '-(3 + 4j)'.
	self assert: (result @env1:real) equals: -3.0.
	self assert: (result @env1:imag) equals: -4.0.
%
