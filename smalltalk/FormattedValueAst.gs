! ------------------- Remove existing behavior from FormattedValueAst
expectvalue /Metaclass3       
doit
FormattedValueAst removeAllMethods.
FormattedValueAst class removeAllMethods.
%
! ------------------- Class methods for FormattedValueAst
! ------------------- Instance methods for FormattedValueAst
set compile_env: 0
category: 'other'
method: FormattedValueAst
children

	^super children
		add: value;
		add: format_spec;
		yourself
%
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
