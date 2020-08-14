! ------------------- Remove existing behavior from AbstractContainer
expectvalue /Metaclass3       
doit
AbstractContainer removeAllMethods.
AbstractContainer class removeAllMethods.
%
! ------------------- Class methods for AbstractContainer
set compile_env: 0
category: 'other'
classmethod: AbstractContainer
containerClass

	^Array
%
category: 'other'
classmethod: AbstractContainer
new

	^self basicNew
		___initialize;
		yourself
%
category: 'other'
classmethod: AbstractContainer
withAll: aCollection

	^self basicNew
		___initialize: aCollection;
		yourself
%
! ------------------- Instance methods for AbstractContainer
set compile_env: 0
category: 'overrides'
method: AbstractContainer
= anObject

	^((anObject isKindOf: AbstractContainer) and: [container = anObject.container]) or: [container = anObject]
%
category: 'overrides'
method: AbstractContainer
hash

	^container hash
%
category: 'overrides'
method: AbstractContainer
postCopy

	container := container copy.
%
set compile_env: 0
category: 'private'
method: AbstractContainer
___at: anIndex

	^container at: anIndex
%
category: 'private'
method: AbstractContainer
___at: aKey put: aValue

	^container at: aKey put: aValue
%
category: 'private'
method: AbstractContainer
___container

	^container
%
category: 'private'
method: AbstractContainer
___includes: anObject

	| method |
	method := anObject __eq__.
	1 to: container size do: [:each | 
		(method value: anObject value: each) == True ifTrue: [^True].
	].
	^False
%
category: 'private'
method: AbstractContainer
___initialize

	container := self class containerClass new.
%
category: 'private'
method: AbstractContainer
___initialize: aCollection

	container := self class containerClass withAll: aCollection.
%
category: 'private'
method: AbstractContainer
___size

	^container size
%
set compile_env: 0
category: 'Python'
method: AbstractContainer
__contains__

	^[:collection :object |
		[
			1 to: (collection __sizeof__ value: collection) ___number do: [:i | 
				| each |
				each := collection __getitem__ value: collection value: (int with: i).
				(each __eq__ value: each value: object) == True ifTrue: [Notification signal].
			].
			False
		] on: Notification do: [:ex | 
			ex return: True
		].
	]
%
category: 'Python'
method: AbstractContainer
__eq__

	^[:lhs :rhs | ((lhs isKindOf: AbstractContainer) and: [(rhs isKindOf: AbstractContainer) and: [lhs.container = rhs.container]]) 
		ifTrue: [ True ] 
		ifFalse: [ False ]]
%
category: 'Python'
method: AbstractContainer
__getitem__

	^[:collection :index | 
		[
			collection ___container at: index ___number
		] on: OffsetError do: [:ex | 
			ex resignalAs: (IndexError new details: 'list index out of range'; yourself).
		]
	]
%
category: 'Python'
method: AbstractContainer
__len__

	^ [ :rhs | rhs ___container size ]
%
category: 'Python'
method: AbstractContainer
__ne__

	^[:lhs :rhs | ((lhs isKindOf: AbstractContainer) and: [(rhs isKindOf: AbstractContainer) and: [lhs.container = rhs.container]]) 
		ifTrue: [ False ] 
		ifFalse: [ True ]]
%
category: 'Python'
method: AbstractContainer
__not_contains__

	^[:collection :object |
		(self __contains__ value: collection value: object) ~~ True ifTrue: [True] ifFalse: [False].
	]
%
category: 'Python'
method: AbstractContainer
__sizeof__

	^[:obj | int with: obj.container size]
%
