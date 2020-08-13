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

	| result |
	result := dict new.
	1 to: keys size do: [:i | 
		result set: ((keys at: i) evaluate: aScope) to: ((values at: i) evaluate: aScope).
	].
	^result
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
