! ------------------- Remove existing behavior from object
expectvalue /Metaclass3       
doit
object removeAllMethods.
object class removeAllMethods.
%
! ------------------- Class methods for object
set compile_env: 0
category: 'other'
classmethod: object
new: aLocalScope

	^self basicNew
		initialize: aLocalScope;
		yourself
%
! ------------------- Instance methods for object
set compile_env: 0
category: 'Python'
method: object
__bool__

	self subclassResponsibility.
%
category: 'Python'
method: object
__class__

	self halt.
%
category: 'Python'
method: object
__delattr__

	self halt.
%
category: 'Python'
method: object
__dir__

	self halt.
%
category: 'Python'
method: object
__doc__

	self halt.
%
category: 'Python'
method: object
__eq__

	^[:lhs :rhs | lhs == rhs ifTrue: [ True ] ifFalse: [ False ]]
%
category: 'Python'
method: object
__format__

	self halt.
%
category: 'Python'
method: object
__ge__

	self halt.
%
category: 'Python'
method: object
__getattribute__

	self halt.
%
category: 'Python'
method: object
__gt__

	self halt.
%
category: 'Python'
method: object
__hash__

	self halt.
%
category: 'Python'
method: object
__init__

	self halt.
%
category: 'Python'
method: object
__init_subclass__

	self halt.
%
category: 'Python'
method: object
__le__

	self halt.
%
category: 'Python'
method: object
__len__

	self subclassResponsibility.
%
category: 'Python'
method: object
__lt__

	self halt.
%
category: 'Python'
method: object
__ne__

	self halt.
%
category: 'Python'
method: object
__new__

	self halt.
%
category: 'Python'
method: object
__reduce__

	self halt.
%
category: 'Python'
method: object
__reduce_ex__

	self halt.
%
category: 'Python'
method: object
__repr__

	self halt.
%
category: 'Python'
method: object
__setattr__

	self halt.
%
category: 'Python'
method: object
__sizeof__

	self halt.
%
category: 'Python'
method: object
__str__

	^[:obj | '<object object at ' , obj asOop printString , '>']
%
category: 'Python'
method: object
__subclasshook__ 

	self halt.
%
