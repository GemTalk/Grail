! ------------------- Remove existing behavior from Pywithitem
expectvalue /Metaclass3       
doit
Pywithitem removeAllMethods.
Pywithitem class removeAllMethods.
%
! ------------------- Class methods for Pywithitem
set compile_env: 0
category: 'other'
classmethod: Pywithitem
parent: aNode

	(aNode isKindOf: PyAstNode) ifFalse: [self error: 'Not a valid parent!'].
	^PyWithItem basicNew
		initialize: aNode;
		yourself
%
! ------------------- Instance methods for Pywithitem
