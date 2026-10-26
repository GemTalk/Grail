Extension { #name : 'cmath' }

{ #category : 'Grail-Private' }
cmath >> ___asComplex: z [
	"Convert z to a complex number if it isn't already"
	| zClass |
	zClass := z @env0:class.
	(zClass == complex) ifTrue: [^ z].
	^ complex __new__: (z @env0:asFloat) _: 0.0

]

{ #category : 'Grail-Private' }
cmath >> ___ported___: aName with: anArray [
	"_grail_cmath's aName applied to anArray.  Every function of this module is
	CPython's Modules/cmathmodule.c ported to Python there, special-value
	tables included; the methods that computed by textbook formulas (sqrt
	through polar form, tan as sin/cos) lost the signs of zeros and the C99
	special values, and overflowed and raised where CPython does not."

	^ ((importlib ___runtimeModule___: '_grail_cmath') ___pyAttrLoad___: aName)
		___pyCallValue___: anArray kw: nil

]

{ #category : 'Grail-Inverse Functions' }
cmath >> __getattr__: aName [
	"PEP 562, for the functions this class does not implement: the inverse
	trigonometric and hyperbolic functions and isclose.  They are CPython's
	Modules/cmathmodule.c, special-value tables included, ported to Python
	in src/python/stdlib/_grail_cmath.py and imported on first use.  Without
	them test_cmath, which lists them at module level, could not be imported.

	A __getattr__ rather than unary methods, for zlib >> __getattr__:'s
	reason: an attribute read and a zero-argument call both perform a unary
	module method, and ``cmath.acos'' must be the function."

	(#('acos' 'acosh' 'asin' 'asinh' 'atan' 'atanh' 'isclose')
		@env0:includes: aName @env0:asString) ifFalse: [
			^ AttributeError ___signal___:
				'module ''cmath'' has no attribute ''' @env0:, aName @env0:asString @env0:, ''''].
	^ (importlib ___runtimeModule___: '_grail_cmath') ___pyAttrLoad___: aName @env0:asSymbol

]

{ #category : 'Grail-Trigonometric Functions' }
cmath >> cos: z [
	"cmathmodule.c's cos; see ___ported___:with:."

	^ self ___ported___: #cos with: { z }

]

{ #category : 'Grail-Hyperbolic Functions' }
cmath >> cosh: z [
	"cmathmodule.c's cosh; see ___ported___:with:."

	^ self ___ported___: #cosh with: { z }

]

{ #category : 'Grail-Constants' }
cmath >> e [
	^ self @env0:at: #e

]

{ #category : 'Grail-Exponential and Logarithmic' }
cmath >> exp: z [
	"cmathmodule.c's exp; see ___ported___:with:."

	^ self ___ported___: #exp with: { z }

]

{ #category : 'Grail-Constants' }
cmath >> inf [
	^ self @env0:at: #inf

]

{ #category : 'Grail-Constants' }
cmath >> infj [
	^ self @env0:at: #infj

]

{ #category : 'Grail-Initialization' }
cmath >> initialize [
	self @env0:at: #pi put: (Float @env0:pi).
	self @env0:at: #e put: (1.0 @env0:exp).
	self @env0:at: #tau put: ((Float @env0:pi) @env0:* 2.0).
	self @env0:at: #inf put: PlusInfinity.
	self @env0:at: #infj put: (complex __new__: 0.0 _: PlusInfinity).
	self @env0:at: #nan put: PlusQuietNaN.
	self @env0:at: #nanj put: (complex __new__: 0.0 _: PlusQuietNaN).

]

{ #category : 'Grail-Classification' }
cmath >> isfinite: z [
	"cmathmodule.c's isfinite; see ___ported___:with:."

	^ self ___ported___: #isfinite with: { z }

]

{ #category : 'Grail-Classification' }
cmath >> isinf: z [
	"cmathmodule.c's isinf; see ___ported___:with:."

	^ self ___ported___: #isinf with: { z }

]

{ #category : 'Grail-Classification' }
cmath >> isnan: z [
	"cmathmodule.c's isnan; see ___ported___:with:."

	^ self ___ported___: #isnan with: { z }

]

{ #category : 'Grail-Exponential and Logarithmic' }
cmath >> log: z [
	"cmathmodule.c's log; see ___ported___:with:."

	^ self ___ported___: #log with: { z }

]

{ #category : 'Grail-Exponential and Logarithmic' }
cmath >> log: z _: base [
	"cmathmodule.c's log(z, base); see ___ported___:with:."

	^ self ___ported___: #log with: { z. base }

]

{ #category : 'Grail-Exponential and Logarithmic' }
cmath >> log10: z [
	"cmathmodule.c's log10; see ___ported___:with:."

	^ self ___ported___: #log10 with: { z }

]

{ #category : 'Grail-Constants' }
cmath >> nan [
	^ self @env0:at: #nan

]

{ #category : 'Grail-Constants' }
cmath >> nanj [
	^ self @env0:at: #nanj

]

{ #category : 'Grail-Polar Coordinates' }
cmath >> phase: z [
	"cmathmodule.c's phase; see ___ported___:with:."

	^ self ___ported___: #phase with: { z }

]

{ #category : 'Grail-Constants' }
cmath >> pi [
	^ self @env0:at: #pi

]

{ #category : 'Grail-Polar Coordinates' }
cmath >> polar: z [
	"cmathmodule.c's polar; see ___ported___:with:."

	^ self ___ported___: #polar with: { z }

]

{ #category : 'Grail-Polar Coordinates' }
cmath >> rect: r _: theta [
	"cmathmodule.c's rect; see ___ported___:with:."

	^ self ___ported___: #rect with: { r. theta }

]

{ #category : 'Grail-Trigonometric Functions' }
cmath >> sin: z [
	"cmathmodule.c's sin; see ___ported___:with:."

	^ self ___ported___: #sin with: { z }

]

{ #category : 'Grail-Hyperbolic Functions' }
cmath >> sinh: z [
	"cmathmodule.c's sinh; see ___ported___:with:."

	^ self ___ported___: #sinh with: { z }

]

{ #category : 'Grail-Exponential and Logarithmic' }
cmath >> sqrt: z [
	"cmathmodule.c's sqrt; see ___ported___:with:."

	^ self ___ported___: #sqrt with: { z }

]

{ #category : 'Grail-Trigonometric Functions' }
cmath >> tan: z [
	"cmathmodule.c's tan; see ___ported___:with:."

	^ self ___ported___: #tan with: { z }

]

{ #category : 'Grail-Hyperbolic Functions' }
cmath >> tanh: z [
	"cmathmodule.c's tanh; see ___ported___:with:."

	^ self ___ported___: #tanh with: { z }

]

{ #category : 'Grail-Constants' }
cmath >> tau [
	^ self @env0:at: #tau

]
