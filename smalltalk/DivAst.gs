! ------------------- Remove existing behavior from DivAst
expectvalue /Metaclass3       
doit
DivAst removeAllMethods.
DivAst class removeAllMethods.
%
! ------------------- Class methods for DivAst
! ------------------- Instance methods for DivAst
set compile_env: 0
category: 'other'
method: DivAst
left: leftOperand right: rightOperand

	rightOperand.number = 0 ifTrue: [ ZeroDivisionError signal: 'division by zero' ].
	^ leftOperand __truediv__ value: rightOperand
%
