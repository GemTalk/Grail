! ------------------- Remove existing behavior from Builtins
removeallmethods Builtins
removeallclassmethods Builtins
! ------------------- Class methods for Builtins
category: 'other'
classmethod: Builtins
new

	self error: 'use singleton'
%
category: 'other'
classmethod: Builtins
printFile

	^printFile
%
category: 'other'
classmethod: Builtins
printFile: aStreamOrNil

	printFile := aStreamOrNil
%
category: 'other'
classmethod: Builtins
reset

	singleton := nil.
	printFile := nil.
%
category: 'other'
classmethod: Builtins
singleton

	singleton ifNil: [
		singleton := self basicNew.
		singleton initialize.
	].
	^singleton
%
! ------------------- Instance methods for Builtins
category: 'other'
method: Builtins
builtins

	^self
%
category: 'other'
method: Builtins
initialize
	super initialize.
	builtins new initialize.
%
category: 'other'
method: Builtins
isBuiltins

	^true
%
