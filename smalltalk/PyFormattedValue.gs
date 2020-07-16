! ------------------- Remove existing behavior from PyFormattedValue
expectvalue /Metaclass3       
doit
PyFormattedValue removeAllMethods.
PyFormattedValue class removeAllMethods.
%
! ------------------- Class methods for PyFormattedValue
! ------------------- Instance methods for PyFormattedValue
set compile_env: 0
category: 'other'
method: PyFormattedValue
_value 
	^ value
%
category: 'other'
method: PyFormattedValue
children

	^super children
		add: value;
		add: format_spec;
		yourself
%
category: 'other'
method: PyFormattedValue
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
