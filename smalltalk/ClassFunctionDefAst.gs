! ------------------- Remove existing behavior from ClassFunctionDefAst
expectvalue /Metaclass3       
doit
ClassFunctionDefAst removeAllMethods.
ClassFunctionDefAst class removeAllMethods.
%
! ------------------- Class methods for ClassFunctionDefAst
! ------------------- Instance methods for ClassFunctionDefAst
set compile_env: 0
category: 'other'
method: ClassFunctionDefAst
callFromClass: receiver arguments: anArray keywords: aSymbolDictionary

	^self
		value: (Array with: receiver) , anArray
		value: aSymbolDictionary
%
category: 'other'
method: ClassFunctionDefAst
callFromObject: receiver arguments: anArray keywords: aSymbolDictionary

	^self
		value: (Array with: receiver classAst) , anArray
		value: aSymbolDictionary
%
