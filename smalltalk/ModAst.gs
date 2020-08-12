! ------------------- Remove existing behavior from ModAst
expectvalue /Metaclass3       
doit
ModAst removeAllMethods.
ModAst class removeAllMethods.
%
! ------------------- Class methods for ModAst
! ------------------- Instance methods for ModAst
set compile_env: 0
category: 'other'
method: ModAst
left: leftOperand right: rightOperand

	rightOperand = 0 ifTrue: [ ZeroDivisionError signal: 'modulo by zero' ].
	^leftOperand rem: rightOperand
%
