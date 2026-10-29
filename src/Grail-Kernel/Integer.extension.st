Extension { #name : 'Integer' }

{ #category : 'Grail-Attribute Access' }
Integer class >> ___grailUnwritableAttributes___ [
	"int's getters -- see Object class >> ___grailUnwritableAttributes___."

	^ #('real' 'imag' 'numerator' 'denominator')

]

{ #category : 'Grail-Attribute Access' }
Integer class >> ___grailUnwritableOwnerName___ [

	^ 'int'

]

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
