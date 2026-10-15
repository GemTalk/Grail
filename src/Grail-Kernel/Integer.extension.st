Extension { #name : 'Integer' }

{ #category : 'Grail-Python Attribute Hook' }
Integer class >> ___pythonValueAttrs___ [
	"Unary methods exposed to Python as VALUE attributes rather than
	bound methods: CPython's int carries numerator/denominator/
	real/imag as properties (vendored fractions.py multiplies
	``numerator.numerator * denominator.denominator'' -- a BoundMethod
	there poisons the arithmetic)."

	^ IdentitySet new
		add: #numerator;
		add: #denominator;
		add: #real;
		add: #imag;
		yourself

]
