! ------------------- Remove existing behavior from ExceptionsTestCase
expectvalue /Metaclass3       
doit
ExceptionsTestCase removeAllMethods.
ExceptionsTestCase class removeAllMethods.
%
! ------------------- Class methods for ExceptionsTestCase
set compile_env: 0
category: 'other'
classmethod: ExceptionsTestCase
filename

	^ 'Exceptions.py'
%
! ------------------- Instance methods for ExceptionsTestCase
set compile_env: 0
category: 'other'
method: ExceptionsTestCase
test
	"test everything with print"

	| x |
	module evaluate.
	x := stdout contents.
	self assert: x = 'AssertionError AttributeError IndexError KeyError NameError NotImplementedError RecursionError TypeError UnboundLocalError ValueError ZeroDivisionError ZeroDivisionError '.
%
category: 'other'
method: ExceptionsTestCase
testSelectively

       | x |
       (self statementsAt: 1) evaluate: aScope.
       x := stdout contents.
       self assert: x = 'AssertionError '.
%
