! ------------------- Remove existing behavior from PyClassFunction
expectvalue /Metaclass3       
doit
PyClassFunction removeAllMethods.
PyClassFunction class removeAllMethods.
%
! ------------------- Class methods for PyClassFunction
! ------------------- Instance methods for PyClassFunction
set compile_env: 0
category: 'other'
method: PyClassFunction
callFromClass: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: (Array with: receiver) , anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: PyClassFunction
callFromObject: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: (Array with: receiver classAst) , anArray
		value: aSymbolDictionary
		value: aScope
%
