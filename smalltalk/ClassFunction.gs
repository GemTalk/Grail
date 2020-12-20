! ------------------- Remove existing behavior from ClassFunction
removeAllMethods ClassFunction
removeAllClassMethods ClassFunction
! ------------------- Class methods for ClassFunction
! ------------------- Instance methods for ClassFunction
set compile_env: 0
category: 'other'
method: ClassFunction
callFromClass: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: (Array with: receiver) , anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: ClassFunction
callFromObject: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: (Array with: receiver classAst) , anArray
		value: aSymbolDictionary
		value: aScope
%
