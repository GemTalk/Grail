! ------------------- Remove existing behavior from SliceAbstractAst
expectvalue /Metaclass3
doit
SliceAbstractAst removeAllMethods.
SliceAbstractAst class removeAllMethods.
%
! ------------------- Class methods for SliceAbstractAst
set compile_env: 0
category: 'other'
classmethod: SliceAbstractAst
isAbstract

	^self == SliceAbstractAst
%
! ------------------- Instance methods for SliceAbstractAst
