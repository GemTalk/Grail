! ------------------- Remove existing behavior from InstanceFunctionDefAst
expectvalue /Metaclass3       
doit
InstanceFunctionDefAst removeAllMethods.
InstanceFunctionDefAst class removeAllMethods.
%
! ------------------- Class methods for InstanceFunctionDefAst
! ------------------- Instance methods for InstanceFunctionDefAst
set compile_env: 0
category: 'other'
method: InstanceFunctionDefAst
callFromClass: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: InstanceFunctionDefAst
callFromObject: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: (Array with: receiver) , anArray
		value: aSymbolDictionary
		value: aScope
%
