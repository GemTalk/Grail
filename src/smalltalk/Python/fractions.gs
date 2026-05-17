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

Provides rational number functionality via the Fraction type.

This module exposes the GemStone Fraction class as `fractions.Fraction`.
There are no callable methods on the module itself; `Fraction` is a
stored attribute (a reference to the GemStone Fraction class) that the
`Fraction` accessor method returns.

See https://docs.python.org/3/library/fractions.html
'
%

expectvalue /Class
doit
fractions category: 'Grail-Modules'
%

! ------------------- Remove existing Python methods from fractions
expectvalue /Metaclass3
doit
fractions removeAllMethods: 1.
fractions class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Grail-Initialization'
method: fractions
initialize
	"Bind the Fraction attribute to GemStone's Fraction class. The
	`Fraction` accessor reads this slot."

	self @env0:at: #fractionClass put: Fraction
%

! ===============================================================================
! Stored attribute (not a callable)
! ===============================================================================

category: 'Grail-Types'
method: fractions
Fraction
	"Return the Fraction type exposed by this module (the GemStone
	Fraction class, populated by `initialize`)."

	^ self @env0:at: #fractionClass
%

set compile_env: 0
