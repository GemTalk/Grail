! ------------------- Remove existing behavior from StatementAst
removeallmethods StatementAst
removeallclassmethods StatementAst
! ------------------- Class methods for StatementAst
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
		^self customChildForParent: aNode peekForCloseParenthesis: true
	] ifFalse: [
		^super parent: aNode
	].
"
%
! ------------------- Instance methods for StatementAst
