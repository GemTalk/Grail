! ===============================================================================
! Python complex Type - Method Implementations
! ===============================================================================
! This file contains method implementations for the Python complex type.
! Complex numbers have a real and imaginary part, both stored as floats.
! ===============================================================================

set compile_env: 0

! ------------------- Remove existing Python methods from complex
removeallmethods complex
removeallclassmethods complex

! ------------------- Smalltalk-side class methods for complex
set compile_env: 0

category: 'Smalltalk'
classmethod: complex
	___real: r imaginary: i
	"Smalltalk-side constructor for creating complex numbers.
	This is called from AST nodes and other Smalltalk code."

	| instance |
	instance := self basicNew.
	instance perform: #__init__:_: env: 2 withArguments: {r. i}.
	^ instance
%

! ------------------- Python class methods for complex
set compile_env: 2

category: 'Python-Initialization'
classmethod: complex
__new__: r _: i
	"Create a new complex number with given real and imaginary parts.
	In Python: complex(real, imag) or complex.__new__(complex, real, imag)"

	| realVal imagVal |
	"Default values"
	realVal := r ifNil: [0.0] ifNotNil: [r].
	imagVal := i ifNil: [0.0] ifNotNil: [i].

	"Use Smalltalk-side constructor"
	^ self perform: #___real:imaginary: env: 0 withArguments: {realVal. imagVal}
%

category: 'Python-Type Conversion'
classmethod: complex
from_number: n
	"Create a complex number from a real number.
	In Python: complex.from_number(5) returns (5+0j)"

	"Use Smalltalk-side constructor"
	^ self perform: #___real:imaginary: env: 0 withArguments: {n. 0.0}
%

! ------------------- Python instance methods for complex
set compile_env: 2

category: 'Python-Initialization'
method: complex
__init__: r _: i
	"Initialize a complex number with real and imaginary parts.
	Called after __new__ in Python, or directly from Smalltalk constructor."

	real := r perform: #asFloat env: 0.
	imag := i perform: #asFloat env: 0.
	^ nil
%

category: 'Python-Attribute Access'
method: complex
real
	"Return the real part of the complex number."
	
	^ real
%

category: 'Python-Attribute Access'
method: complex
imag
	"Return the imaginary part of the complex number."
	
	^ imag
%

category: 'Numbers'
method: complex
conjugate
	"Return the complex conjugate."

	^ complex perform: #___real:imaginary: env: 0 withArguments: {real. imag perform: #negated env: 0}
%

category: 'Python-String Representation'
method: complex
__repr__
	"Return string representation of complex number."

	| realStr imagStr |
	realStr := real perform: #printString env: 0.
	imagStr := imag perform: #abs env: 0.
	imagStr := imagStr perform: #printString env: 0.

	^ ((real perform: #= env: 0 withArguments: {0.0})
		ifTrue: [imagStr perform: #, env: 0 withArguments: {'j'}]
		ifFalse: [
			(imag perform: #>= env: 0 withArguments: {0.0})
				ifTrue: [
					((('(' perform: #, env: 0 withArguments: {realStr})
						perform: #, env: 0 withArguments: {'+'})
						perform: #, env: 0 withArguments: {imagStr})
						perform: #, env: 0 withArguments: {'j)'}
				]
				ifFalse: [
					((('(' perform: #, env: 0 withArguments: {realStr})
						perform: #, env: 0 withArguments: {'-'})
						perform: #, env: 0 withArguments: {imagStr})
						perform: #, env: 0 withArguments: {'j)'}
				]
		]) perform: #asUnicodeString env: 0
%

category: 'Python-String Representation'
method: complex
__str__
	"Return string representation (same as __repr__ for complex)."

	^ self __repr__
%

category: 'Python-Comparison'
method: complex
__eq__: other
	"Test equality with another complex number."
	
	| otherReal otherImag |
	(other perform: #class env: 0) == complex ifFalse: [^ false].
	otherReal := other real.
	otherImag := other imag.
	^ (real perform: #= env: 0 withArguments: {otherReal}) 
		and: [imag perform: #= env: 0 withArguments: {otherImag}]
%

category: 'Python-Comparison'
method: complex
__ne__: other
	"Test inequality with another complex number."

	^ (self __eq__: other) perform: #not env: 0
%

category: 'Python-Comparison'
method: complex
__lt__: other
	"Complex numbers cannot be ordered - raise TypeError."

	self error: 'TypeError: ''<'' not supported between instances of ''complex'' and ''complex'''
%

category: 'Python-Comparison'
method: complex
__le__: other
	"Complex numbers cannot be ordered - raise TypeError."

	self error: 'TypeError: ''<='' not supported between instances of ''complex'' and ''complex'''
%

category: 'Python-Comparison'
method: complex
__gt__: other
	"Complex numbers cannot be ordered - raise TypeError."

	self error: 'TypeError: ''>'' not supported between instances of ''complex'' and ''complex'''
%

category: 'Python-Comparison'
method: complex
__ge__: other
	"Complex numbers cannot be ordered - raise TypeError."

	self error: 'TypeError: ''>='' not supported between instances of ''complex'' and ''complex'''
%

category: 'Python-Arithmetic'
method: complex
__add__: other
	"Add two complex numbers or complex and real."

	| otherReal otherImag |
	(other perform: #class env: 0) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other perform: #asFloat env: 0.
			otherImag := 0.0.
		].
	^ complex perform: #___real:imaginary: env: 0 withArguments: {
		real perform: #+ env: 0 withArguments: {otherReal}.
		imag perform: #+ env: 0 withArguments: {otherImag}
	}
%

category: 'Python-Arithmetic'
method: complex
__radd__: other
	"Right-hand add (commutative, so same as __add__)."

	^ self __add__: other
%

category: 'Python-Arithmetic'
method: complex
__sub__: other
	"Subtract two complex numbers or complex and real."

	| otherReal otherImag |
	(other perform: #class env: 0) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other perform: #asFloat env: 0.
			otherImag := 0.0.
		].
	^ complex perform: #___real:imaginary: env: 0 withArguments: {
		real perform: #- env: 0 withArguments: {otherReal}.
		imag perform: #- env: 0 withArguments: {otherImag}
	}
%

category: 'Python-Arithmetic'
method: complex
__rsub__: other
	"Right-hand subtract (other - self)."

	| otherReal otherImag |
	(other perform: #class env: 0) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other perform: #asFloat env: 0.
			otherImag := 0.0.
		].
	^ complex perform: #___real:imaginary: env: 0 withArguments: {
		otherReal perform: #- env: 0 withArguments: {real}.
		otherImag perform: #- env: 0 withArguments: {imag}
	}
%

category: 'Python-Arithmetic'
method: complex
__mul__: other
	"Multiply two complex numbers or complex and real.
	(a+bi)(c+di) = (ac-bd) + (ad+bc)i"

	| otherReal otherImag newReal newImag ac bd ad bc |
	(other perform: #class env: 0) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other perform: #asFloat env: 0.
			otherImag := 0.0.
		].

	ac := real perform: #* env: 0 withArguments: {otherReal}.
	bd := imag perform: #* env: 0 withArguments: {otherImag}.
	ad := real perform: #* env: 0 withArguments: {otherImag}.
	bc := imag perform: #* env: 0 withArguments: {otherReal}.

	newReal := ac perform: #- env: 0 withArguments: {bd}.
	newImag := ad perform: #+ env: 0 withArguments: {bc}.

	^ complex perform: #___real:imaginary: env: 0 withArguments: {newReal. newImag}
%

category: 'Python-Arithmetic'
method: complex
__rmul__: other
	"Right-hand multiply (commutative, so same as __mul__)."

	^ self __mul__: other
%

category: 'Python-Arithmetic'
method: complex
__truediv__: other
	"Divide two complex numbers or complex by real.
	(a+bi)/(c+di) = [(ac+bd) + (bc-ad)i] / (c²+d²)"

	| otherReal otherImag denom ac bd bc ad newReal newImag |
	(other perform: #class env: 0) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other perform: #asFloat env: 0.
			otherImag := 0.0.
		].

	"Calculate denominator: c² + d²"
	denom := (otherReal perform: #* env: 0 withArguments: {otherReal})
		perform: #+ env: 0 withArguments: {
			otherImag perform: #* env: 0 withArguments: {otherImag}
		}.

	"Calculate numerator components"
	ac := real perform: #* env: 0 withArguments: {otherReal}.
	bd := imag perform: #* env: 0 withArguments: {otherImag}.
	bc := imag perform: #* env: 0 withArguments: {otherReal}.
	ad := real perform: #* env: 0 withArguments: {otherImag}.

	newReal := (ac perform: #+ env: 0 withArguments: {bd})
		perform: #/ env: 0 withArguments: {denom}.
	newImag := (bc perform: #- env: 0 withArguments: {ad})
		perform: #/ env: 0 withArguments: {denom}.

	^ complex perform: #___real:imaginary: env: 0 withArguments: {newReal. newImag}
%

category: 'Python-Arithmetic'
method: complex
__rtruediv__: other
	"Right-hand divide (other / self)."

	| otherReal otherImag denom ac bd bc ad newReal newImag |
	(other perform: #class env: 0) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other perform: #asFloat env: 0.
			otherImag := 0.0.
		].

	"Calculate denominator: a² + b² (self's magnitude squared)"
	denom := (real perform: #* env: 0 withArguments: {real})
		perform: #+ env: 0 withArguments: {
			imag perform: #* env: 0 withArguments: {imag}
		}.

	"Calculate numerator components for other / self"
	ac := otherReal perform: #* env: 0 withArguments: {real}.
	bd := otherImag perform: #* env: 0 withArguments: {imag}.
	bc := otherImag perform: #* env: 0 withArguments: {real}.
	ad := otherReal perform: #* env: 0 withArguments: {imag}.

	newReal := (ac perform: #+ env: 0 withArguments: {bd})
		perform: #/ env: 0 withArguments: {denom}.
	newImag := (bc perform: #- env: 0 withArguments: {ad})
		perform: #/ env: 0 withArguments: {denom}.

	^ complex perform: #___real:imaginary: env: 0 withArguments: {newReal. newImag}
%

category: 'Python-Arithmetic'
method: complex
__pow__: other
	"Raise complex number to a power.
	For now, only support integer powers."

	| result n |
	"Convert other to integer"
	n := other perform: #asInteger env: 0.

	"Handle special cases"
	n == 0 ifTrue: [^ complex perform: #___real:imaginary: env: 0 withArguments: {1.0. 0.0}].
	n == 1 ifTrue: [^ self].

	"Positive powers: multiply self n times"
	(n perform: #> env: 0 withArguments: {0}) ifTrue: [
		result := self.
		((n perform: #- env: 0 withArguments: {1}) perform: #timesRepeat: env: 0 withArguments: {[
			result := result __mul__: self.
		]}).
		^ result
	].

	"Negative powers: 1 / (self ** -n)"
	result := complex perform: #___real:imaginary: env: 0 withArguments: {1.0. 0.0}.
	^ result __truediv__: (self __pow__: (n perform: #negated env: 0))
%

category: 'Python-Arithmetic'
method: complex
__rpow__: other
	"Right-hand power (other ** self).
	This is complex and requires logarithms - stub for now."

	self error: 'NotImplementedError: complex __rpow__ not yet implemented'
%

category: 'Python-Arithmetic'
method: complex
__neg__
	"Negate the complex number."

	^ complex perform: #___real:imaginary: env: 0 withArguments: {
		real perform: #negated env: 0.
		imag perform: #negated env: 0
	}
%

category: 'Python-Arithmetic'
method: complex
__pos__
	"Unary plus (returns self)."

	^ self
%

category: 'Python-Arithmetic'
method: complex
__abs__
	"Return the magnitude (absolute value) of the complex number.
	|a+bi| = sqrt(a² + b²)"

	| realSquared imagSquared sumSquares magnitude |
	realSquared := real perform: #* env: 0 withArguments: {real}.
	imagSquared := imag perform: #* env: 0 withArguments: {imag}.
	sumSquares := realSquared perform: #+ env: 0 withArguments: {imagSquared}.
	magnitude := sumSquares perform: #sqrt env: 0.
	^ magnitude
%

category: 'Python-Type Conversion'
method: complex
__bool__
	"Return True if complex number is non-zero, False otherwise."

	^ (real perform: #~= env: 0 withArguments: {0.0})
		or: [imag perform: #~= env: 0 withArguments: {0.0}]
%

category: 'Python-Type Conversion'
method: complex
__complex__
	"Return self (already a complex number)."

	^ self
%

category: 'Python-String Representation'
method: complex
__format__: formatSpec
	"Format the complex number according to format specification.
	For now, just return __repr__ - full format spec support is complex."

	^ self __repr__
%

category: 'Python-Serialization'
method: complex
__getnewargs__
	"Return arguments for pickling/unpickling."

	"Return a tuple (array) of (real, imag) for reconstruction"
	^ {real. imag}
%

category: 'Python-Serialization'
method: complex
__getstate__
	"Return state for pickling. Complex numbers have no additional state."

	^ nil
%

! ------------------- Reset compile environment
set compile_env: 0
