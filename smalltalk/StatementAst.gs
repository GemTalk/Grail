! ------------------- Remove existing behavior from StatementAst
expectvalue /Metaclass3
doit
StatementAst removeAllMethods.
StatementAst class removeAllMethods.
%
! ------------------- Class methods for StatementAst
set compile_env: 0
category: 'other'
classmethod: StatementAst
statementFrom: aNode

	| symbol class |
	symbol := ((aNode stream upTo: $() , 'Ast') asSymbol.
	class := Python at: symbol.
	"Pywithitem may return an instance of WithItemAst"
	^class parent: aNode

"
	self == StatementAst ifTrue: [
		^self customChildForParent: aNode peekForCloseParenthesis: true.
	] ifFalse: [
		^super parent: aNode
	].
"
%
! ------------------- Instance methods for StatementAst
