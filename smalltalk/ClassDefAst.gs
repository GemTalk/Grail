! ------------------- Remove existing behavior from ClassDefAst
expectvalue /Metaclass3       
doit
ClassDefAst removeAllMethods.
ClassDefAst class removeAllMethods.
%
! ------------------- Class methods for ClassDefAst
! ------------------- Instance methods for ClassDefAst
set compile_env: 0
category: 'other'
method: ClassDefAst
children

	^super children
		addAll: bases;
		addAll: keywords;
		add: body;
		addAll: decorator_list;
		yourself
%
category: 'other'
method: ClassDefAst
evaluate

	| result |
	[
		result := body evaluate.
	] on: CancelNotification do: [:ex |
		ex return.
	].
	^result
%
category: 'other'
method: ClassDefAst
initialize
	"ClassDef(identifier name, expr* bases, 
		keyword* keywords, stmt* body, expr* decorator_list)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := stream upTo: $'.
	self commaSpace.
	bases := self collectAst: [self expression].
	self commaSpace.
	keywords := self collectAst: [KeywordAst parent: self].
	self commaSpace.
	body := LocalScope parent: self.
	self commaSpace.
	decorator_list := self collectAst:[self expression].
	self readPosition.
%
