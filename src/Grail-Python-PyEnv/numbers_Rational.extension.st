Extension { #name : 'numbers_Rational' }

{ #category : 'Grail-Mixins' }
numbers_Rational >> __float__ [
	"PEP 3141 concrete mixin: float(rational) == numerator/denominator
	under true division.  CPython's numbers.Rational provides this;
	vendored fractions.Fraction defines no __float__ of its own and
	inherits it from here."

	^ ((self ___pyAttrLoad___: #numerator) @env0:asFloat)
		@env0:/ ((self ___pyAttrLoad___: #denominator) @env0:asFloat)

]
