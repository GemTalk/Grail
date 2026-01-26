! ===============================================================================
! numbers Module (Python 'numbers' module - PEP 3141)
! ===============================================================================
! This file contains the Python numbers module implementation.
! The numbers module defines a hierarchy of numeric Abstract Base Classes (ABCs).
! ===============================================================================

! ------------------- Remove existing Python methods from numbers ABCs and module
expectvalue /Metaclass3
doit
numbers_Number removeAllMethods: 2.
numbers_Number class removeAllMethods: 2.
numbers_Complex removeAllMethods: 2.
numbers_Complex class removeAllMethods: 2.
numbers_Real removeAllMethods: 2.
numbers_Real class removeAllMethods: 2.
numbers_Rational removeAllMethods: 2.
numbers_Rational class removeAllMethods: 2.
numbers_Integral removeAllMethods: 2.
numbers_Integral class removeAllMethods: 2.
numbers removeAllMethods: 2.
numbers class removeAllMethods: 2.
%

set compile_env: 2

! ===============================================================================
! ABC Class Methods - numbers_Number (root ABC)
! ===============================================================================

category: 'Python-ABC'
classmethod: numbers_Number
register: aClass
	"Register a class as a virtual subclass of this ABC.
	After registration, isinstance(instance, ABC) returns True."

	registeredTypes == nil ifTrue: [registeredTypes := IdentitySet ___new___].
	registeredTypes ___add___: aClass
%

category: 'Python-ABC'
classmethod: numbers_Number
registeredTypes
	"Return the set of registered types for this ABC."

	registeredTypes == nil ifTrue: [registeredTypes := IdentitySet ___new___].
	^ registeredTypes
%

category: 'Python-ABC'
classmethod: numbers_Number
__instancecheck__: instance
	"Check if instance is an instance of this ABC.
	Returns true if instance's class is a subclass of this ABC,
	or if instance's class has been registered with this ABC or any of its sub-ABCs."

	| instanceClass |
	instanceClass := instance ___class___.

	"Check normal inheritance - use env 0 for isSubclassOf:"
	(instanceClass perform: #isSubclassOf: env: 0 withArguments: {self}) ifTrue: [^ true].

	"Check registered types in this ABC and all subclass ABCs"
	(self isClassRegistered: instanceClass) ifTrue: [^ true].

	^ false
%

category: 'Python-ABC'
classmethod: numbers_Number
isClassRegistered: aClass
	"Check if aClass or any of its superclasses is registered with this ABC or any ABC subclass of this ABC."

	| currentClass abcSubclasses |

	"Check if any superclass of aClass is registered directly with us"
	currentClass := aClass.
	[currentClass notNil] whileTrue: [
		(self registeredTypes perform: #includes: env: 0 withArguments: {currentClass}) ifTrue: [^ true].
		currentClass := currentClass perform: #superclass env: 0.
	].

	"Check if aClass is registered with any of our ABC subclasses"
	abcSubclasses := self perform: #subclasses env: 0.
	abcSubclasses perform: #do: env: 0 withArguments: {[:subABC |
		(subABC isClassRegistered: aClass) ifTrue: [^ true].
	]}.

	^ false
%

category: 'Python-ABC'
classmethod: numbers_Number
__subclasscheck__: aClass
	"Check if aClass is a subclass of this ABC.
	Returns true if aClass inherits from this ABC,
	or if aClass has been registered with this ABC or any of its sub-ABCs."

	"Check normal inheritance - use env 0 for isSubclassOf:"
	(aClass perform: #isSubclassOf: env: 0 withArguments: {self}) ifTrue: [^ true].

	"Check if aClass is registered with this ABC or any subclass ABC"
	(self isClassRegistered: aClass) ifTrue: [^ true].

	^ false
%

! ===============================================================================
! ABC Class Methods - Inherited by all ABC subclasses
! The register:, registeredTypes, __instancecheck__:, and __subclasscheck__:
! methods are inherited from numbers_Number. Each ABC class has its own
! registeredTypes slot (class instance variable inherited from numbers_Number).
! ===============================================================================

! ===============================================================================
! numbers Module Instance Methods
! ===============================================================================

category: 'Python-Initialization'
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

category: 'Python-Initialization'
method: numbers
initialize_Number
	"Bind the Number ABC."
	Number := numbers_Number
%

category: 'Python-Initialization'
method: numbers
initialize_Complex
	"Bind the Complex ABC."
	Complex := numbers_Complex
%

category: 'Python-Initialization'
method: numbers
initialize_Real
	"Bind the Real ABC."
	Real := numbers_Real
%

category: 'Python-Initialization'
method: numbers
initialize_Rational
	"Bind the Rational ABC."
	Rational := numbers_Rational
%

category: 'Python-Initialization'
method: numbers
initialize_Integral
	"Bind the Integral ABC."
	Integral := numbers_Integral
%

category: 'Python-Initialization'
method: numbers
registerBuiltinTypes
	"Register built-in numeric types with the appropriate ABCs.
	This makes isinstance(5, numbers.Integral) return True."

	"Register int (Integer and its subclasses) with Integral"
	numbers_Integral register: Integer.
	numbers_Integral register: SmallInteger.
	numbers_Integral register: LargeInteger.

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

! ------------------- Attribute accessors

category: 'Python-Attributes'
method: numbers
Number
	"Return the Number ABC."
	^ Number
%

category: 'Python-Attributes'
method: numbers
Number: aValue
	"Set the Number ABC."
	Number := aValue
%

category: 'Python-Attributes'
method: numbers
Complex
	"Return the Complex ABC."
	^ Complex
%

category: 'Python-Attributes'
method: numbers
Complex: aValue
	"Set the Complex ABC."
	Complex := aValue
%

category: 'Python-Attributes'
method: numbers
Real
	"Return the Real ABC."
	^ Real
%

category: 'Python-Attributes'
method: numbers
Real: aValue
	"Set the Real ABC."
	Real := aValue
%

category: 'Python-Attributes'
method: numbers
Rational
	"Return the Rational ABC."
	^ Rational
%

category: 'Python-Attributes'
method: numbers
Rational: aValue
	"Set the Rational ABC."
	Rational := aValue
%

category: 'Python-Attributes'
method: numbers
Integral
	"Return the Integral ABC."
	^ Integral
%

category: 'Python-Attributes'
method: numbers
Integral: aValue
	"Set the Integral ABC."
	Integral := aValue
%

set compile_env: 0

