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
callFromClass: receiver arguments: anArray keywords: aSymbolDictionary

	^self
		value: anArray
		value: aSymbolDictionary
%
category: 'other'
method: InstanceFunctionDefAst
callFromObject: receiver arguments: anArray keywords: aSymbolDictionary

	^self
		value: (Array with: receiver) , anArray
		value: aSymbolDictionary
%
