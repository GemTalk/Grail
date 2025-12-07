! ------------------- Remove existing behavior from BoolOpAst
removeallmethods BoolOpAst
removeallclassmethods BoolOpAst
! ------------------- Class methods for BoolOpAst
category: 'other'
classmethod: BoolOpAst
isAbstract

	^self == BoolOpAst
%
! ------------------- Instance methods for BoolOpAst
category: 'other'
method: BoolOpAst
initialize
	"BoolOp(boolop op, expr* values)
				boolop = And | Or"

	(self stream peekFor: $)) ifFalse: [self error].
	self commaSpace.
	values := self collectAst: [self expression].
	self readPosition.
%
