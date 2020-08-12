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
	aSymbol == #'__iter__' ifTrue: [^Iterator onDictionary: self].
	self halt.
%
category: 'other'
method: PyDictionary
get: aSymbol

	^self
		at: aSymbol
		ifAbsent: [PyNameError signal]
%
category: 'other'
method: PyDictionary
membershipIncludes: anObject
	"Smalltalk checks for values!"

	^self keys includes: anObject asSymbol
%
