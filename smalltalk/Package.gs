! ------------------- Remove existing behavior from Package
removeallmethods Package
removeallclassmethods Package
! ------------------- Class methods for Package
! ------------------- Instance methods for Package
category: 'other'
method: Package
isPackage

	^true
%
category: 'other'
method: Package
load: aPathString as: aNameString

	super load: aPathString , '/__init__.py' as: aNameString.
	path := aPathString.
%
