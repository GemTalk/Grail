Extension { #name : 'numbers' }

{ #category : 'Grail-Type Accessors' }
numbers >> Complex [
	"Return the Complex ABC."
	^ self @env0:at: #Complex

]

{ #category : 'Grail-Initialization' }
numbers >> initialize [
	"Initialize all module attributes and register built-in types with ABCs."
	self
		initialize_Number;
		initialize_Complex;
		initialize_Real;
		initialize_Rational;
		initialize_Integral;
		registerBuiltinTypes;
		yourself

]

{ #category : 'Grail-Initialization' }
numbers >> initialize_Complex [
	"Bind the Complex ABC."
	self @env0:at: #Complex put: numbers_Complex

]

{ #category : 'Grail-Initialization' }
numbers >> initialize_Integral [
	"Bind the Integral ABC."
	self @env0:at: #Integral put: numbers_Integral

]

{ #category : 'Grail-Initialization' }
numbers >> initialize_Number [
	"Bind the Number ABC."
	self @env0:at: #Number put: numbers_Number

]

{ #category : 'Grail-Initialization' }
numbers >> initialize_Rational [
	"Bind the Rational ABC."
	self @env0:at: #Rational put: numbers_Rational

]

{ #category : 'Grail-Initialization' }
numbers >> initialize_Real [
	"Bind the Real ABC."
	self @env0:at: #Real put: numbers_Real

]

{ #category : 'Grail-Type Accessors' }
numbers >> Integral [
	"Return the Integral ABC."
	^ self @env0:at: #Integral

]

{ #category : 'Grail-Type Accessors' }
numbers >> Number [
	"Return the Number ABC."
	^ self @env0:at: #Number

]

{ #category : 'Grail-Type Accessors' }
numbers >> Rational [
	"Return the Rational ABC."
	^ self @env0:at: #Rational

]

{ #category : 'Grail-Type Accessors' }
numbers >> Real [
	"Return the Real ABC."
	^ self @env0:at: #Real

]

{ #category : 'Grail-Initialization' }
numbers >> registerBuiltinTypes [
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

]
