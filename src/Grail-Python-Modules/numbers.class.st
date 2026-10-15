"Python numbers module (PEP 3141).

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

"
Class {
	#name : 'numbers',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
