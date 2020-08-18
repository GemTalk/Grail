! ------------------- Remove existing behavior from frozenset
expectvalue /Metaclass3       
doit
frozenset removeAllMethods.
frozenset class removeAllMethods.
%
! ------------------- Class methods for frozenset
set compile_env: 0
category: 'other'
classmethod: frozenset
containerClass

	^ Set
%
! ------------------- Instance methods for frozenset
set compile_env: 0
category: 'other'
method: frozenset
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	(attributes includesKey: aSymbol) ifFalse: [ AttributeError signal ].
	self halt.
%
