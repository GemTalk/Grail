! ------------------- Remove existing behavior from Tuple
expectvalue /Metaclass3       
doit
Tuple removeAllMethods.
Tuple class removeAllMethods.
%
! ------------------- Class methods for Tuple
! ------------------- Instance methods for Tuple
set compile_env: 0
category: 'other'
method: Tuple
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	aSymbol == #'__iter__' ifTrue: [^Iterator on: self].
	self halt.
%
