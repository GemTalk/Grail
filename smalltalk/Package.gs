! ------------------- Remove existing behavior from Package
expectvalue /Metaclass3
doit
Package removeAllMethods.
Package class removeAllMethods.
%
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
