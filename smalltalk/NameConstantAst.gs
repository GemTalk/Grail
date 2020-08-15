! ------------------- Remove existing behavior from NameConstantAst
expectvalue /Metaclass3       
doit
NameConstantAst removeAllMethods.
NameConstantAst class removeAllMethods.
%
! ------------------- Class methods for NameConstantAst
set compile_env: 0
category: 'other'
classmethod: NameConstantAst
isAbstract

	^self == NameConstantAst
%
category: 'other'
classmethod: NameConstantAst
resetSingleton
"
	FalseAst resetSingleton.
	NoneAst resetSingleton.
	TrueAst resetSingleton.
"
	singleton := self basicNew.
%
category: 'other'
classmethod: NameConstantAst
singleton

	^singleton ifNil: [singleton := self basicNew].
%
category: 'other'
classmethod: NameConstantAst
subclassDelimiter

	^$,
%
! ------------------- Instance methods for NameConstantAst
set compile_env: 0
category: 'other'
method: NameConstantAst
evaluate: aScope

	self subclassResponsibility.
%
category: 'other'
method: NameConstantAst
initialize

self error: 'deprecated'.
	self stream skip: -1.
	self readPosition.
%
