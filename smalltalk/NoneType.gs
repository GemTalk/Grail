! ------------------- Remove existing behavior from NoneType
removeallmethods NoneType
removeallclassmethods NoneType
! ------------------- Class methods for NoneType
! ------------------- Instance methods for NoneType
category: 'other'
method: NoneType
printOn: aStream

	aStream nextPutAll: 'None'.
%
category: 'Python'
method: NoneType
__bool__
	"None is always falsy"

	^False
%
category: 'Python'
method: NoneType
__doc__

	^str ___value: 'The type of the None singleton.'
%
category: 'Python'
method: NoneType
__repr__

	^str ___value: 'None'
%
