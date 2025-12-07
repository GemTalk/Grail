! ------------------- Remove existing behavior from FormattedValueAst
removeallmethods FormattedValueAst
removeallclassmethods FormattedValueAst
! ------------------- Class methods for FormattedValueAst
! ------------------- Instance methods for FormattedValueAst
category: 'other'
method: FormattedValueAst
initialize
	"FormattedValue(expr value, int? conversion, expr? format_spec)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	conversion := (stream upTo: $,) asNumber.
	stream skip: -1.
	self commaSpace.
	format_spec:= self optionalExpression.
	self readPosition.
%
