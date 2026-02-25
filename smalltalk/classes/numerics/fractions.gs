! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- fractions class (Python 'fractions' module)
expectvalue /Class
doit
module subclass: 'fractions'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
fractions comment:
'Python fractions module.

This class provides rational number functionality via the Fraction type.
Currently implemented as an empty stub module.
'
%

expectvalue /Class
doit
fractions category: 'Modules'
%

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
fractions removeAllMethods: 1.
fractions class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Types'
method: fractions
Fraction
	"Return the Fraction type exposed by this module."
	^ self ___at___: #fractionClass
%

category: 'Python-Types'
method: fractions
Fraction: aClass
	"Set the Fraction type (for monkey patching or testing)."
	self ___at___: #fractionClass put: aClass
%

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
	self ___at___: #fractionClass put: Fraction
%

set compile_env: 0
