! ------------------- Remove existing behavior from Scope
expectvalue /Metaclass3       
doit
Scope removeAllMethods.
Scope class removeAllMethods.
%
! ------------------- Class methods for Scope
set compile_env: 0
category: 'other'
classmethod: Scope
outer: aScope

	^self basicNew
		initialize: aScope;
		yourself
%
! ------------------- Instance methods for Scope
set compile_env: 0
category: 'other'
method: Scope
addAssociation: anAssociation

	(variables includesKey: anAssociation key) ifTrue: [self halt].
	variables add: anAssociation.
%
category: 'other'
method: Scope
associationAt: aSymbol

	variables at: aSymbol ifAbsentPut: [_remoteNil].
	^variables associationAt: aSymbol
%
category: 'other'
method: Scope
get: aSymbol

	^variables 
		at: aSymbol
		ifAbsent: [outer get: aSymbol]
%
category: 'other'
method: Scope
globals

	self subclassResponsibility.
%
category: 'other'
method: Scope
initialize: aScope

	outer := aScope.
	variables := PyDictionary new.
%
category: 'other'
method: Scope
inner

	^LocalScope outer: self
%
category: 'other'
method: Scope
outer

	^outer
%
category: 'other'
method: Scope
set: aSymbol to: aValue

	variables at: aSymbol put: aValue.
%
