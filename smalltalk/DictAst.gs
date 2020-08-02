! ------------------- Remove existing behavior from DictAst
expectvalue /Metaclass3       
doit
DictAst removeAllMethods.
DictAst class removeAllMethods.
%
! ------------------- Class methods for DictAst
! ------------------- Instance methods for DictAst
set compile_env: 0
category: 'other'
method: DictAst
children

	^super children
		addAll: keys;
		addAll: values;
		yourself
%
category: 'other'
method: DictAst
evaluate: aScope

	| dict |
	dict := Dictionary new.
	1 to: keys size do: [:i | 
		dict at: (keys at: i) put: (values at: i).
	].
	^dict
%
category: 'other'
method: DictAst
initialize
	"Dict(expr* keys, expr* values)"

	keys := self collectAst: [self expression].
	self commaSpace.
	values := self collectAst: [self expression].
	self readPosition.
%
