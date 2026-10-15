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
NativeModule ifNil: [self error: 'NativeModule is not defined. Check file ordering.'].
%


! ------- numbers class (Python 'numbers' module)
expectvalue /Class
doit
NativeModule subclass: 'numbers'
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

	^ ((self ___pyAttrLoad___: #numerator) @env0:asFloat)
		@env0:/ ((self ___pyAttrLoad___: #denominator) @env0:asFloat)
%

! ------- The other concrete mixins of CPython's numbers.py (#1619).  Each is
! the Python one-liner it is in numbers.py, spelled with the sends Grail's
! codegen emits for the same expression, so reflected operands and
! NotImplemented behave as they do in compiled Python.  real / imag /
! numerator / denominator are read-only PROPERTIES there, so here they are a
! getter paired with a refusing setter -- the shape @property compiles to.

category: 'Grail-Mixins'
classmethod: numbers_Real
___grailBuiltinPropertyNames___
	"The same names, as builtin ``property'' objects: what the class
	__dict__ (object >> ___classDict___) enters for them."

	^ #( #real #imag )
%

category: 'Grail-Mixins'
classmethod: numbers_Real
___grailOwnPropertyNames___
	"real and imag are properties in CPython's numbers.Real, so a class read
	(``numbers.Real.real'', ``vars(numbers.Real)'') answers a property object,
	as it does for a Python class's own @property (ClassDefAst emits the same
	record)."

	^ #( #real #imag )
%

category: 'Grail-Mixins'
classmethod: numbers_Integral
___grailBuiltinPropertyNames___
	"The same names, as builtin ``property'' objects: what the class
	__dict__ (object >> ___classDict___) enters for them."

	^ #( #numerator #denominator )
%

category: 'Grail-Mixins'
classmethod: numbers_Integral
___grailOwnPropertyNames___
	"numerator and denominator are properties in CPython's numbers.Integral;
	see numbers_Real class >> ___grailOwnPropertyNames___."

	^ #( #numerator #denominator )
%

category: 'Grail-Mixins'
method: numbers_Complex
__bool__
	"PEP 3141 concrete mixin: ``self != 0''."

	^ (self ___cmpNe___: 0)
%

category: 'Grail-Mixins'
method: numbers_Complex
__sub__: other
	"PEP 3141 concrete mixin: ``self + -other''."

	^ self ___binOpAdd___: other __neg__
%

category: 'Grail-Mixins'
method: numbers_Complex
__rsub__: other
	"PEP 3141 concrete mixin: ``-self + other''."

	^ self __neg__ ___binOpAdd___: other
%

category: 'Grail-Mixins'
method: numbers_Real
__complex__
	"PEP 3141 concrete mixin: ``complex(float(self))''."

	^ complex @env1:__new__: (float @env1:__new__: self)
%

category: 'Grail-Mixins'
method: numbers_Real
real
	"PEP 3141 concrete mixin: a real number is its own real part, ``+self''."

	^ self __pos__
%

category: 'Grail-Property-ReadOnly'
method: numbers_Real
real: ___1
	"A read-only property, as CPython's is: assigning raises AttributeError."

	^ self ___raiseReadOnlyProperty___: 'real'
%

category: 'Grail-Mixins'
method: numbers_Real
imag
	"PEP 3141 concrete mixin: a real number's imaginary part is 0."

	^ 0
%

category: 'Grail-Property-ReadOnly'
method: numbers_Real
imag: ___1
	"A read-only property, as CPython's is: assigning raises AttributeError."

	^ self ___raiseReadOnlyProperty___: 'imag'
%

category: 'Grail-Mixins'
method: numbers_Real
conjugate
	"PEP 3141 concrete mixin: a real number is its own conjugate, ``+self''."

	^ self __pos__
%

category: 'Grail-Mixins'
method: numbers_Real
__divmod__: other
	"PEP 3141 concrete mixin: ``(self // other, self % other)''."

	^ tuple @env0:withAll: { self ___binOpFloorDiv___: other. self ___binOpMod___: other }
%

category: 'Grail-Mixins'
method: numbers_Real
__rdivmod__: other
	"PEP 3141 concrete mixin: ``(other // self, other % self)''."

	^ tuple @env0:withAll: { other ___binOpFloorDiv___: self. other ___binOpMod___: self }
%

category: 'Grail-Mixins'
method: numbers_Integral
__index__
	"PEP 3141 concrete mixin: ``int(self)''."

	^ int @env1:__new__: self
%

category: 'Grail-Mixins'
method: numbers_Integral
__float__
	"PEP 3141 concrete mixin: ``float(int(self))'', overriding Rational's ratio."

	^ float @env1:__new__: (int @env1:__new__: self)
%

category: 'Grail-Mixins'
method: numbers_Integral
numerator
	"PEP 3141 concrete mixin: an integer is its own numerator, ``+self''."

	^ self __pos__
%

category: 'Grail-Property-ReadOnly'
method: numbers_Integral
numerator: ___1
	"A read-only property, as CPython's is: assigning raises AttributeError."

	^ self ___raiseReadOnlyProperty___: 'numerator'
%

category: 'Grail-Mixins'
method: numbers_Integral
denominator
	"PEP 3141 concrete mixin: an integer's denominator is 1."

	^ 1
%

category: 'Grail-Property-ReadOnly'
method: numbers_Integral
denominator: ___1
	"A read-only property, as CPython's is: assigning raises AttributeError."

	^ self ___raiseReadOnlyProperty___: 'denominator'
%

category: 'Grail-ABC'
classmethod: numbers_Number
___numbersAbcAbstractNames___
	"CPython's ``__abstractmethods__'' for the numbers ABC that IS the
	receiver -- copied from CPython 3.14's numbers.py, where Real supplies
	real / imag / conjugate / __complex__ concretely, Rational __float__,
	and Integral __float__ / numerator / denominator -- or nil for any other
	class, a Python subclass included."

	self @env0:== numbers_Number ifTrue: [^ #()].
	self @env0:== numbers_Complex ifTrue: [^ #(
		#'__abs__' #'__add__' #'__complex__' #'__eq__' #'__mul__' #'__neg__'
		#'__pos__' #'__pow__' #'__radd__' #'__rmul__' #'__rpow__'
		#'__rtruediv__' #'__truediv__' #'conjugate' #'imag' #'real' )].
	self @env0:== numbers_Real ifTrue: [^ #(
		#'__abs__' #'__add__' #'__ceil__' #'__eq__' #'__float__' #'__floor__'
		#'__floordiv__' #'__le__' #'__lt__' #'__mod__' #'__mul__' #'__neg__'
		#'__pos__' #'__pow__' #'__radd__' #'__rfloordiv__' #'__rmod__'
		#'__rmul__' #'__round__' #'__rpow__' #'__rtruediv__' #'__truediv__'
		#'__trunc__' )].
	self @env0:== numbers_Rational ifTrue: [^ #(
		#'__abs__' #'__add__' #'__ceil__' #'__eq__' #'__floor__'
		#'__floordiv__' #'__le__' #'__lt__' #'__mod__' #'__mul__' #'__neg__'
		#'__pos__' #'__pow__' #'__radd__' #'__rfloordiv__' #'__rmod__'
		#'__rmul__' #'__round__' #'__rpow__' #'__rtruediv__' #'__truediv__'
		#'__trunc__' #'denominator' #'numerator' )].
	self @env0:== numbers_Integral ifTrue: [^ #(
		#'__abs__' #'__add__' #'__and__' #'__ceil__' #'__eq__' #'__floor__'
		#'__floordiv__' #'__int__' #'__invert__' #'__le__' #'__lshift__'
		#'__lt__' #'__mod__' #'__mul__' #'__neg__' #'__or__' #'__pos__'
		#'__pow__' #'__radd__' #'__rand__' #'__rfloordiv__' #'__rlshift__'
		#'__rmod__' #'__rmul__' #'__ror__' #'__round__' #'__rpow__'
		#'__rrshift__' #'__rshift__' #'__rtruediv__' #'__rxor__'
		#'__truediv__' #'__trunc__' #'__xor__' )].
	^ nil
%

category: 'Grail-ABC'
classmethod: numbers_Number
___numbersClass: aClass defines: aSym
	"Does aClass ITSELF give the Python name aSym an implementation: a method
	compiled at any arity (unary, ``name:'', ``name:_:'', ..., the varargs
	``_name:kw:''), or a class attribute in its own holder?  A secondary
	base's methods count: Grail copies them onto the class."

	| s sel |
	s := aSym @env0:asString.
	(aClass @env0:includesSelector: s @env0:asSymbol environmentId: 1) ifTrue: [^ true].
	(aClass @env0:includesSelector: ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol environmentId: 1)
		ifTrue: [^ true].
	sel := s @env0:, ':'.
	1 @env0:to: 6 do: [:n |
		(aClass @env0:includesSelector: sel @env0:asSymbol environmentId: 1) ifTrue: [^ true].
		sel := sel @env0:, '_:'].
	^ (aClass ___classBodyDynamicRead___: s @env0:asSymbol) @env0:notNil
%

category: 'Grail-ABC'
classmethod: numbers_Number
___numbersComputeAbstract___
	"The abstract methods a Python subclass of a numbers ABC leaves
	unimplemented: its nearest numbers ABC's set, less every name a class
	between the two implements.  ABCMeta.__new__'s computation, which is
	what decides that ``class C(numbers.Integral): pass'' cannot be
	instantiated."

	| abc own names |
	abc := self.
	[(own := abc ___numbersAbcAbstractNames___) @env0:isNil]
		whileTrue: [abc := abc @env0:superclass].
	names := own @env0:reject: [:n |
		| c found |
		c := self.
		found := false.
		[found @env0:not @env0:and: [c @env0:~~ abc]] whileTrue: [
			found := self ___numbersClass: c defines: n.
			c := c @env0:superclass].
		found].
	^ frozenset @env0:withAll: (names @env0:collect: [:n | n @env0:asString])
%

category: 'Grail-Class Attrs'
classmethod: numbers_Number
__abstractmethods__
	"Read by object class >> ___grailAbstractInstantiationError___ on every
	instantiation, so numbers.Complex() and a subclass that leaves an
	abstract method unimplemented are refused with CPython's TypeError
	(#1592).  The ABCs answer CPython's sets; a Python subclass answers the
	set computed when it was defined (___pyClassDefined___:), as CPython's
	ABCMeta does -- or computes it, for a class defined before this
	existed.

	The definition-time set is stored as the class's own
	``__abstractmethods__'', where CPython keeps it too, so an explicit
	``C.__abstractmethods__ = ...'' -- abc.update_abstractmethods does it --
	replaces it.  The session overlay is read first: a store on a canonical
	class lands there."

	| own stored |
	own := self ___numbersAbcAbstractNames___.
	own @env0:notNil ifTrue: [
		^ frozenset @env0:withAll: (own @env0:collect: [:n | n @env0:asString])].
	stored := self ___classAttrOverlayLookup___: self name: #'__abstractmethods__'.
	stored @env0:notNil ifTrue: [^ stored].
	stored := self ___classBodyDynamicRead___: #'__abstractmethods__'.
	stored @env0:notNil ifTrue: [^ stored].
	^ self ___numbersComputeAbstract___
%

category: 'Grail-ABC'
classmethod: numbers_Number
___grailAbcMetaclassInChain___
	"The numbers ABCs are ABCMeta classes in CPython, so instantiating one,
	or a subclass, is checked for abstract methods.  Here they are Smalltalk
	classes with no Python metaclass, which the ABCMeta probe this overrides
	cannot see -- so numbers.Complex() built an object."

	^ true
%

category: 'Grail-ABC'
classmethod: numbers_Number
___grailAbstractInstantiationError___
	"The common case first: a concrete subclass -- fractions.Fraction, built
	on every arithmetic result -- has an empty set, read from the holder
	without formatting anything."

	(self __abstractmethods__ @env0:size) @env0:= 0 ifTrue: [^ nil].
	^ super ___grailAbstractInstantiationError___
%

category: 'Grail-ABC'
classmethod: numbers_Number
___pyClassDefined___: attrNames
	"After the default hook, record the subclass's abstract methods, once,
	at the moment CPython's ABCMeta.__new__ computes them: a method
	assigned to the class later does not change the answer in either."

	| result |
	result := super ___pyClassDefined___: attrNames.
	self ___classHolderAttrStore___: #'__abstractmethods__'
		put: self ___numbersComputeAbstract___.
	^ result
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

category: 'Grail-Type Accessors'
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

category: 'Grail-Type Accessors'
method: numbers
Integral
	"Return the Integral ABC."
	^ self @env0:at: #Integral
%


category: 'Grail-Type Accessors'
method: numbers
Number
	"Return the Number ABC."
	^ self @env0:at: #Number
%


category: 'Grail-Type Accessors'
method: numbers
Rational
	"Return the Rational ABC."
	^ self @env0:at: #Rational
%


category: 'Grail-Type Accessors'
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

	"Decimal (ScaledDecimal) registers with Number ONLY, which is what
	CPython does -- decimal.py's sole tower call is
	``_numbers.Number.register(Decimal)'', so isinstance(Decimal(1),
	numbers.Rational) and isinstance(Decimal(1), numbers.Real) are both
	False there.  It was registered with Rational here, and that is not a
	harmless widening: fractions.Fraction's reflected-operator fallback
	(fractions.py:726) tests ``isinstance(a, numbers.Rational)'' and, on a
	hit, reads a.numerator -- which a Decimal does not expose to Python.
	So ``Decimal('1.5') + Fraction(1, 2)'' raised
	``AttributeError: 'SmallScaledDecimal' object has no attribute
	'numerator''' instead of the TypeError CPython raises and
	test_fractions' testMixingWithDecimal asserts in both directions.
	With Number, the fallback declines, both sides answer NotImplemented,
	and the TypeError comes out.

	``Fraction(Decimal('0.5'))'' keeps working, by the same route CPython
	uses for it: fractions.py:250 accepts anything answering
	as_integer_ratio(), and Python/Decimal.gs answers it exactly."
	numbers_Number register: ScaledDecimal.

	"Register complex with Complex"
	numbers_Complex register: complex
%

set compile_env: 0
