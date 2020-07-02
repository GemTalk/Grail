! ------------------- Remove existing behavior from PyRandom
expectvalue /Metaclass3       
doit
PyRandom removeAllMethods.
PyRandom class removeAllMethods.
%
! ------------------- Class methods for PyRandom
! ------------------- Instance methods for PyRandom
set compile_env: 0
category: 'functions'
method: PyRandom
randint: arguments keywords: keywords
	"This is not actually a builtin"
	"It should be part of importing random"

^Random new integerBetween: arguments first and: arguments second.
%
