! ------------------- Remove existing behavior from PyInstanceFunction
expectvalue /Metaclass3       
doit
PyInstanceFunction removeAllMethods.
PyInstanceFunction class removeAllMethods.
%
! ------------------- Class methods for PyInstanceFunction
! ------------------- Instance methods for PyInstanceFunction
set compile_env: 0
category: 'other'
method: PyInstanceFunction
callFromClass: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: PyInstanceFunction
callFromObject: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: (Array with: receiver) , anArray
		value: aSymbolDictionary
		value: aScope
%
