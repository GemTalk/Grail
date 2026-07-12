! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%


! ------- numbers module ABC classes (Python 'numbers' module)
! These are Abstract Base Classes that form the numeric tower (PEP 3141)

! ------- numbers_Number class (root of numeric hierarchy)
expectvalue /Class
doit
"PythonInstance, not bare object: user classes deriving from the
tower (class Fraction(numbers.Rational)) must land on the
PythonInstance chain -- every instance-attr / property-pair /
class-attr branch in ___pyAttrLoad___ gates on it (the twilio
ClientBase(object) lesson)."
PythonInstance subclass: 'numbers_Number'
  instVarNames: #()
  classVars: #()
  classInstVars: #('registeredTypes')
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
numbers_Number comment:
'Python numbers.Number - root of the numeric hierarchy (PEP 3141).

This is an Abstract Base Class. Use isinstance(x, Number) to check
if an argument x is a number, without caring what kind.

Class instance variable:
  registeredTypes - Set of classes registered with this ABC
'
%

expectvalue /Class
doit
numbers_Number category: 'Grail-Numbers-ABC'
%

! ------------------- Superclass check
run
numbers_Number ifNil: [self error: 'numbers_Number is not defined. Check file ordering.'].
%


! ------- numbers_Complex class (complex number operations)
expectvalue /Class
doit
numbers_Number subclass: 'numbers_Complex'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
numbers_Complex comment:
'Python numbers.Complex - complex number operations (PEP 3141).

Defines operations that work on the builtin complex type:
conversion to complex and bool, real, imag, +, -, *, /, **, abs(),
conjugate(), ==, and !=.
'
%

expectvalue /Class
doit
numbers_Complex category: 'Grail-Numbers-ABC'
%

! ------------------- Superclass check
run
numbers_Complex ifNil: [self error: 'numbers_Complex is not defined. Check file ordering.'].
%


! ------- numbers_Real class (real number operations)
expectvalue /Class
doit
numbers_Complex subclass: 'numbers_Real'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
numbers_Real comment:
'Python numbers.Real - real number operations (PEP 3141).

Adds operations that work on real numbers: conversion to float,
trunc(), floor(), ceil(), round(), divmod(), //, %, <, <=, >, >=.
'
%

expectvalue /Class
doit
numbers_Real category: 'Grail-Numbers-ABC'
%

! ------------------- Superclass check
run
numbers_Real ifNil: [self error: 'numbers_Real is not defined. Check file ordering.'].
%


! ------- numbers_Rational class (rational number operations)
expectvalue /Class
doit
numbers_Real subclass: 'numbers_Rational'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
numbers_Rational comment:
'Python numbers.Rational - rational number operations (PEP 3141).

Adds numerator and denominator properties. The values should be
in lowest terms with a positive denominator.
'
%

expectvalue /Class
doit
numbers_Rational category: 'Grail-Numbers-ABC'
%

! ------------------- Superclass check
run
numbers_Rational ifNil: [self error: 'numbers_Rational is not defined. Check file ordering.'].
%


! ------- numbers_Integral class (integral number operations)
expectvalue /Class
doit
numbers_Rational subclass: 'numbers_Integral'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
numbers_Integral comment:
'Python numbers.Integral - integral number operations (PEP 3141).

Adds conversion to int, pow with modulus, and bit-string operations:
<<, >>, &, ^, |, ~.
'
%

expectvalue /Class
doit
numbers_Integral category: 'Grail-Numbers-ABC'
%

! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%


! ------- numbers class (Python 'numbers' module)
expectvalue /Class
doit
module subclass: 'numbers'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
numbers comment:
'Python numbers module (PEP 3141).

This module defines a hierarchy of numeric Abstract Base Classes (ABCs)
which progressively define more operations. None of the types defined
in this module are intended to be instantiated.

The numeric tower:
  Number - root of the hierarchy
  Complex - complex number operations
  Real - real number operations
  Rational - numerator/denominator properties
  Integral - integer operations

Use isinstance(x, numbers.Number) to check if x is any kind of number.
'
%

expectvalue /Class
doit
numbers category: 'Grail-Modules'
%


! ===============================================================================
! numbers Module (Python 'numbers' module - PEP 3141)
! ===============================================================================
! This file contains the Python numbers module implementation.
! The numbers module defines a hierarchy of numeric Abstract Base Classes (ABCs).
! ===============================================================================

! ------------------- Remove existing Python methods from numbers ABCs and module
expectvalue /Metaclass3
doit
numbers_Number removeAllMethods: 1.
numbers_Number class removeAllMethods: 1.
numbers_Complex removeAllMethods: 1.
numbers_Complex class removeAllMethods: 1.
numbers_Real removeAllMethods: 1.
numbers_Real class removeAllMethods: 1.
numbers_Rational removeAllMethods: 1.
numbers_Rational class removeAllMethods: 1.
numbers_Integral removeAllMethods: 1.
numbers_Integral class removeAllMethods: 1.
numbers removeAllMethods: 1.
numbers class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Smalltalk Bridge'
method: numbers_Rational
truncated
	"Kernel bridge: #truncated -> __trunc__ (see asFloat)."

	^ self perform: #'__trunc__' env: 1
%

category: 'Grail-Smalltalk Bridge'
method: numbers_Rational
asFloat
	"Kernel-numeric bridge: GemStone numeric code (round:, coercions,
	mixed comparisons) sends env-0 #asFloat.  Forward to the Python
	__float__ protocol so a vendored Fraction participates instead of
	dying with an uncatchable MNU (test_fractions testConversions)."

	^ self perform: #'__float__' env: 1
%

set compile_env: 1

category: 'Grail-Mixins'
method: numbers_Rational
__float__
	"PEP 3141 concrete mixin: float(rational) == numerator/denominator
	under true division.  CPython's numbers.Rational provides this;
	vendored fractions.Fraction defines no __float__ of its own and
	inherits it from here."

	^ ((self @env1:___pyAttrLoad___: #numerator) @env0:asFloat)
		@env0:/ ((self @env1:___pyAttrLoad___: #denominator) @env0:asFloat)
%

category: 'Grail-ABC'
classmethod: numbers_Number
__instancecheck__: instance
	"Check if instance is an instance of this ABC.
	Returns true if instance's class is a subclass of this ABC,
	or if instance's class has been registered with this ABC or any of its sub-ABCs."

	| instanceClass |
	instanceClass := instance @env0:class.

	"Check normal inheritance - use env 0 for isSubclassOf:"
	(instanceClass @env0:isSubclassOf: self) ifTrue: [^ true].

	"Check registered types in this ABC and all subclass ABCs"
	(self isClassRegistered: instanceClass) ifTrue: [^ true].

	^ false
%

category: 'Grail-ABC'
classmethod: numbers_Number
__subclasscheck__: aClass
	"Check if aClass is a subclass of this ABC.
	Returns true if aClass inherits from this ABC,
	or if aClass has been registered with this ABC or any of its sub-ABCs."

	"Check normal inheritance - use env 0 for isSubclassOf:"
	(aClass @env0:isSubclassOf: self) ifTrue: [^ true].

	"Check if aClass is registered with this ABC or any subclass ABC"
	(self isClassRegistered: aClass) ifTrue: [^ true].

	^ false
%

category: 'Grail-ABC'
classmethod: numbers_Number
isClassRegistered: aClass
	"Check if aClass or any of its superclasses is registered with this ABC or any ABC subclass of this ABC."

	| currentClass abcSubclasses |

	"Check if any superclass of aClass is registered directly with us"
	currentClass := aClass.
	[currentClass notNil] whileTrue: [
		(self registeredTypes @env0:includes: currentClass) ifTrue: [^ true].
		currentClass := currentClass @env0:superclass.
	].

	"Check if aClass is registered with any of our ABC subclasses"
	abcSubclasses := self @env0:subclasses.
	abcSubclasses @env0:do: [:subABC |
		(subABC isClassRegistered: aClass) ifTrue: [^ true].
	].

	^ false
%

category: 'Grail-ABC'
classmethod: numbers_Number
register: aClass
	"Register a class as a virtual subclass of this ABC.
	After registration, isinstance(instance, ABC) returns True."

	self registeredTypes @env0:add: aClass
%

category: 'Grail-ABC'
classmethod: numbers_Number
registeredTypes
	"The set of registered types for this ABC.  SESSION-LOCAL
	(SessionTemps, keyed per ABC class): registrations run from the
	numbers module's initialize (session time) and from user code
	(ABC.register(cls)); the old classInstVar write dirtied the
	committed ABC classes (multi-user commit conflicts).  The
	classInstVar declaration remains but is unused."

	| all mine |
	all := SessionTemps @env0:current @env0:at: #GrailNumbersRegistry otherwise: nil.
	all == nil ifTrue: [
		all := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #GrailNumbersRegistry put: all].
	mine := all @env0:at: self otherwise: nil.
	mine == nil ifTrue: [
		mine := IdentitySet ___new___.
		all @env0:at: self put: mine].
	^ mine
%

category: 'Grail-Attributes'
method: numbers
Complex
	"Return the Complex ABC."
	^ self @env0:at: #Complex
%


category: 'Grail-Initialization'
method: numbers
initialize
	"Initialize all module attributes and register built-in types with ABCs."
	self
		initialize_Number;
		initialize_Complex;
		initialize_Real;
		initialize_Rational;
		initialize_Integral;
		registerBuiltinTypes;
		yourself
%

category: 'Grail-Initialization'
method: numbers
initialize_Complex
	"Bind the Complex ABC."
	self @env0:at: #Complex put: numbers_Complex
%

category: 'Grail-Initialization'
method: numbers
initialize_Integral
	"Bind the Integral ABC."
	self @env0:at: #Integral put: numbers_Integral
%

category: 'Grail-Initialization'
method: numbers
initialize_Number
	"Bind the Number ABC."
	self @env0:at: #Number put: numbers_Number
%

category: 'Grail-Initialization'
method: numbers
initialize_Rational
	"Bind the Rational ABC."
	self @env0:at: #Rational put: numbers_Rational
%

category: 'Grail-Initialization'
method: numbers
initialize_Real
	"Bind the Real ABC."
	self @env0:at: #Real put: numbers_Real
%

category: 'Grail-Attributes'
method: numbers
Integral
	"Return the Integral ABC."
	^ self @env0:at: #Integral
%


category: 'Grail-Attributes'
method: numbers
Number
	"Return the Number ABC."
	^ self @env0:at: #Number
%


category: 'Grail-Attributes'
method: numbers
Rational
	"Return the Rational ABC."
	^ self @env0:at: #Rational
%


category: 'Grail-Attributes'
method: numbers
Real
	"Return the Real ABC."
	^ self @env0:at: #Real
%


category: 'Grail-Initialization'
method: numbers
registerBuiltinTypes
	"Register built-in numeric types with the appropriate ABCs.
	This makes isinstance(5, numbers.Integral) return True."

	"Register int (Integer and its subclasses) with Integral"
	numbers_Integral register: Integer.
	numbers_Integral register: SmallInteger.
	numbers_Integral register: LargeInteger.
	"int SUBCLASSES route their storage base to AbstractPyInt
	(Class>>___subclass___) -- they are ints for the tower too
	(fractions.Fraction(CustomInt(13), CustomInt(5)) checks
	isinstance(_, numbers.Rational))."
	numbers_Integral register: AbstractPyInt.

	"Register bool (Boolean) with Integral (bool is subclass of int in Python)"
	numbers_Integral register: Boolean.

	"Register float (Float and subclasses) with Real"
	numbers_Real register: Float.
	numbers_Real register: SmallDouble.

	"Register Fraction with Rational"
	numbers_Rational register: Fraction.
	numbers_Rational register: SmallFraction.
	numbers_Rational register: ScaledDecimal.

	"Register complex with Complex"
	numbers_Complex register: complex
%

set compile_env: 0
