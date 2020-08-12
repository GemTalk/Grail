! ------------------- Remove existing behavior from Namespace
expectvalue /Metaclass3       
doit
Namespace removeAllMethods.
Namespace class removeAllMethods.
%
! ------------------- Class methods for Namespace
! ------------------- Instance methods for Namespace
set compile_env: 0
category: 'other'
method: Namespace
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	aSymbol == #'items' ifTrue: [^self].
	aSymbol == #'__iter__' ifTrue: [^Iterator onDictionary: self].
	self halt.
%
category: 'other'
method: Namespace
get: aKey

	^self
		at: aKey asSymbol
		ifAbsent: [NameError signal]
%
category: 'other'
method: Namespace
membershipIncludes: anObject
	"Smalltalk checks for values!"

	^self keys includes: anObject asSymbol
%
category: 'other'
method: Namespace
set: aKey to: aValue

	d 
		at: aKey asSymbol
		put: aValue.
%
