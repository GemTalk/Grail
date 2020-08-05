! ------------------- Remove existing behavior from PyDictionary
expectvalue /Metaclass3       
doit
PyDictionary removeAllMethods.
PyDictionary class removeAllMethods.
%
! ------------------- Class methods for PyDictionary
! ------------------- Instance methods for PyDictionary
set compile_env: 0
category: 'other'
method: PyDictionary
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	aSymbol == #'items' ifTrue: [^self].

	self halt.
%
