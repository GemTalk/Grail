! ===============================================================================
! module Methods (Python 'module' type)
! ===============================================================================
! This file will contain Python method implementations for the module class.
! For now, the module type has no Python-level methods defined.
! ==============================================================================

! ------------------- Remove existing Python methods from module
expectvalue /Metaclass3
doit
module removeAllMethods: 2.
module class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Class methods for module

category: 'Python-Singleton'
classmethod: module
new
	"Raise an error: use instance instead of new"
	TypeError ___signal___: ('Use #''instance'' instead of #''new'' for ' ___concat___: (self ___name___ ___asString___ ___concat___: ' module'))
%

category: 'Python-Singleton'
classmethod: module
instance
	"Return the singleton instance of a module subclass.
	Creates it if it doesn't exist."
	instance == nil ifTrue: [
		instance := self perform: #new env: 0.
		instance perform: #initialize env: 2
	].
	^ instance
%

category: 'Python-Singleton'
classmethod: module
clearInstance
	"Clear the singleton instance (useful for testing)"
	instance := nil
%

! ------------------- Instance methods for module

category: 'Python-Accessors'
method: module
__name__
	^ self ___at___: #__name__
%

category: 'Python-Accessors'
method: module
__name__: aValue
	self ___at___: #__name__ put: aValue
%

category: 'Python-Accessors'
method: module
__package__
	^ self ___at___: #__package__
%

category: 'Python-Accessors'
method: module
__package__: aValue
	self ___at___: #__package__ put: aValue
%

category: 'Python-Accessors'
method: module
__loader__
	^ self ___at___: #__loader__
%

category: 'Python-Accessors'
method: module
__loader__: aValue
	self ___at___: #__loader__ put: aValue
%

category: 'Python-Accessors'
method: module
__spec__
	^ self ___at___: #__spec__
%

category: 'Python-Accessors'
method: module
__spec__: aValue
	self ___at___: #__spec__ put: aValue
%

category: 'Python-Accessors'
method: module
__doc__
	"Return the module docstring, falling back to the base object docstring if unset."
	| doc |
	doc := self ___at___: #__doc__.
	doc == nil ifTrue: [^ super __doc__].
	^ doc
%

category: 'Python-Accessors'
method: module
__doc__: aValue
	self ___at___: #__doc__ put: aValue
%

! ------------------- Reset compile environment to Smalltalk
set compile_env: 0

category: 'Convenience Methods'
classmethod: module
___instance___
	^ self perform: #instance env: 2
%
