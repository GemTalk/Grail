"Python numbers.Rational - rational number operations (PEP 3141).

Adds numerator and denominator properties. The values should be
in lowest terms with a positive denominator.

"
Class {
	#name : 'numbers_Rational',
	#superclass : 'numbers_Real',
	#category : 'Grail-Numbers-ABC'
}

{ #category : 'Grail-Smalltalk Bridge' }
numbers_Rational >> asFloat [
	"Kernel-numeric bridge: GemStone numeric code (round:, coercions,
	mixed comparisons) sends env-0 #asFloat.  Forward to the Python
	__float__ protocol so a vendored Fraction participates instead of
	dying with an uncatchable MNU (test_fractions testConversions)."

	^ self perform: #'__float__' env: 1

]

{ #category : 'Grail-Smalltalk Bridge' }
numbers_Rational >> truncated [
	"Kernel bridge: #truncated -> __trunc__ (see asFloat)."

	^ self perform: #'__trunc__' env: 1

]
