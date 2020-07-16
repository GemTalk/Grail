! ------------------- Remove existing behavior from PyDict
expectvalue /Metaclass3       
doit
PyDict removeAllMethods.
PyDict class removeAllMethods.
%
! ------------------- Class methods for PyDict
! ------------------- Instance methods for PyDict
set compile_env: 0
category: 'other'
method: PyDict
children

	^super children
		addAll: keys;
		addAll: values;
		yourself
%
category: 'other'
method: PyDict
evaluate

	| dict |
	dict := Dictionary new.
	1 to: keys size do: [:i | 
		dict at: (keys at: i) put: (values at: i).
	].
	^dict
%
category: 'other'
method: PyDict
initialize
	"Dict(expr* keys, expr* values)"

	keys := self collectAst: [self expression].
	self commaSpace.
	values := self collectAst: [self expression].
	self readPosition.
%
