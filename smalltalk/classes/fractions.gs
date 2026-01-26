! ===============================================================================
! fractions Module (Python 'fractions' module)
! ===============================================================================
! This file contains the Python fractions module implementation.
! The fractions module provides rational number arithmetic via the Fraction type.
! This implementation exposes the GemStone Fraction class as fractions.Fraction.
! ===============================================================================

! ------------------- Remove existing Python methods from fractions
expectvalue /Metaclass3
doit
fractions removeAllMethods: 2.
fractions class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Instance methods for fractions

category: 'Python-Initialization'
method: fractions
initialize
	"Initialize all module attributes with their default values."
	self
		initialize_Fraction;
		yourself
%

category: 'Python-Initialization'
method: fractions
initialize_Fraction
	"Bind the Fraction attribute to GemStone's Fraction class."
	fractionClass := Fraction
%

category: 'Python-Types'
method: fractions
Fraction
	"Return the Fraction type exposed by this module."
	^ fractionClass
%

category: 'Python-Types'
method: fractions
Fraction: aClass
	"Set the Fraction type (for monkey patching or testing)."
	fractionClass := aClass
%

set compile_env: 0

