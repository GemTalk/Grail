! ------------------- Remove existing behavior from Package
removeAllMethods Package
removeAllClassMethods Package
! ------------------- Class methods for Package
! ------------------- Instance methods for Package
set compile_env: 0
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
