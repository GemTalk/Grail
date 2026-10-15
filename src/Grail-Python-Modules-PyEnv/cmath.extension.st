Extension { #name : 'cmath' }

{ #category : 'Grail-Private' }
cmath >> ___asComplex: z [
	"Convert z to a complex number if it isn't already"
	| zClass |
	zClass := z @env0:class.
	(zClass == complex) ifTrue: [^ z].
	^ complex __new__: (z @env0:asFloat) _: 0.0

]

{ #category : 'Grail-Trigonometric Functions' }
cmath >> cos: z [
	"cmath.cos(z) — cos(a+bi) = cos(a)*cosh(b) - i*sin(a)*sinh(b)"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ complex __new__: ((real @env0:cos) @env0:* (imag @env0:cosh)) _: (((real @env0:sin) @env0:* (imag @env0:sinh)) @env0:negated)

]

{ #category : 'Grail-Hyperbolic Functions' }
cmath >> cosh: z [
	"cmath.cosh(z) — cosh(a+bi) = cosh(a)*cos(b) + i*sinh(a)*sin(b)"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ complex __new__: ((real @env0:cosh) @env0:* (imag @env0:cos)) _: ((real @env0:sinh) @env0:* (imag @env0:sin))

]

{ #category : 'Grail-Constants' }
cmath >> e [
	^ self @env0:at: #e

]

{ #category : 'Grail-Exponential and Logarithmic' }
cmath >> exp: z [
	"cmath.exp(z) — exp(a+bi) = exp(a) * (cos(b) + i*sin(b))"

	| zComplex real imag expReal |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	expReal := real @env0:exp.
	^ complex __new__: (expReal @env0:* (imag @env0:cos)) _: (expReal @env0:* (imag @env0:sin))

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
	"cmath.isfinite(z) — True if both real and imag parts are finite"

	| zComplex real imag realKind imagKind |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	realKind := real @env0:_getKind.
	imagKind := imag @env0:_getKind.
	^ ((realKind @env0:<= 2) or: [realKind == 4])
		and: [(imagKind @env0:<= 2) or: [imagKind == 4]]

]

{ #category : 'Grail-Classification' }
cmath >> isinf: z [
	"cmath.isinf(z) — True if either part is infinity"

	| zComplex real imag realKind imagKind |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	realKind := real @env0:_getKind.
	imagKind := imag @env0:_getKind.
	^ (realKind == 3) or: [imagKind == 3]

]

{ #category : 'Grail-Classification' }
cmath >> isnan: z [
	"cmath.isnan(z) — True if either part is NaN"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ (real @env0:_isNaN) or: [imag @env0:_isNaN]

]

{ #category : 'Grail-Exponential and Logarithmic' }
cmath >> log: z [
	"cmath.log(z) — log(|z|) + i*arg(z)"

	| zComplex real imag r theta |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	r := (((real @env0:* real) @env0:+ (imag @env0:* imag)) @env0:sqrt).
	theta := imag @env0:arcTan2: real.
	^ complex __new__: (r @env0:ln) _: theta

]

{ #category : 'Grail-Exponential and Logarithmic' }
cmath >> log10: z [
	"cmath.log10(z) — log(z) / log(10)"

	| logZ ln10 |
	logZ := self log: z.
	ln10 := 10.0 @env0:ln.
	^ logZ __truediv__: (complex __new__: ln10 _: 0.0)

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
	"cmath.phase(z) — return the phase (argument) of z in radians"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ imag @env0:arcTan2: real

]

{ #category : 'Grail-Constants' }
cmath >> pi [
	^ self @env0:at: #pi

]

{ #category : 'Grail-Polar Coordinates' }
cmath >> polar: z [
	"cmath.polar(z) — return (r, theta) as a tuple"

	| zComplex real imag r theta |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	r := (((real @env0:* real) @env0:+ (imag @env0:* imag)) @env0:sqrt).
	theta := imag @env0:arcTan2: real.
	^ tuple @env0:withAll: (tuple @env0:with: r with: theta)

]

{ #category : 'Grail-Polar Coordinates' }
cmath >> rect: r _: theta [
	"cmath.rect(r, theta) — convert polar to rectangular"

	| rFloat thetaFloat |
	rFloat := r @env0:asFloat.
	thetaFloat := theta @env0:asFloat.
	^ complex __new__: (rFloat @env0:* (thetaFloat @env0:cos)) _: (rFloat @env0:* (thetaFloat @env0:sin))

]

{ #category : 'Grail-Trigonometric Functions' }
cmath >> sin: z [
	"cmath.sin(z) — sin(a+bi) = sin(a)*cosh(b) + i*cos(a)*sinh(b)"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ complex __new__: ((real @env0:sin) @env0:* (imag @env0:cosh)) _: ((real @env0:cos) @env0:* (imag @env0:sinh))

]

{ #category : 'Grail-Hyperbolic Functions' }
cmath >> sinh: z [
	"cmath.sinh(z) — sinh(a+bi) = sinh(a)*cos(b) + i*cosh(a)*sin(b)"

	| zComplex real imag |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	^ complex __new__: ((real @env0:sinh) @env0:* (imag @env0:cos)) _: ((real @env0:cosh) @env0:* (imag @env0:sin))

]

{ #category : 'Grail-Exponential and Logarithmic' }
cmath >> sqrt: z [
	"cmath.sqrt(z) — sqrt(r) * (cos(theta/2) + i*sin(theta/2))"

	| zComplex real imag r theta sqrtR halfTheta |
	zComplex := self ___asComplex: z.
	real := zComplex real.
	imag := zComplex imag.
	r := (((real @env0:* real) @env0:+ (imag @env0:* imag)) @env0:sqrt).
	theta := imag @env0:arcTan2: real.
	sqrtR := r @env0:sqrt.
	halfTheta := theta @env0:/ 2.0.
	^ complex __new__: (sqrtR @env0:* (halfTheta @env0:cos)) _: (sqrtR @env0:* (halfTheta @env0:sin))

]

{ #category : 'Grail-Trigonometric Functions' }
cmath >> tan: z [
	"cmath.tan(z) — sin(z) / cos(z)"

	^ (self sin: z) __truediv__: (self cos: z)

]

{ #category : 'Grail-Hyperbolic Functions' }
cmath >> tanh: z [
	"cmath.tanh(z) — sinh(z) / cosh(z)"

	^ (self sinh: z) __truediv__: (self cosh: z)

]

{ #category : 'Grail-Constants' }
cmath >> tau [
	^ self @env0:at: #tau

]
