! ------------------- Remove existing behavior from AbstractContainer
removeAllMethods AbstractContainer
removeAllClassMethods AbstractContainer
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

	| items |
	items := aCollection.
	(aCollection isKindOf: AbstractContainer) ifTrue: [ items := aCollection ___container ].
	^ self basicNew
		___initialize: items;
		yourself
%
! ------------------- Instance methods for AbstractContainer
set compile_env: 0
category: 'other'
method: AbstractContainer
add: anObject

	self __add__ value: self value: anObject
%
category: 'other'
method: AbstractContainer
asArray

	^ container collect: [ :each | (each isKindOf: AbstractNumber) ifTrue: [ each ___number ] ] "TODO: allow hetergeneous containers"
%
set compile_env: 0
category: 'overrides'
method: AbstractContainer
= anObject

	| res |
	res := ((anObject isKindOf: AbstractContainer) and: [container = anObject.container]) or: [container = anObject].
	^ res
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
	attributes := SymbolDictionary new.
%
category: 'private'
method: AbstractContainer
___size

	^container size
%
category: 'private'
method: AbstractContainer
at: anIndex

	^container at: anIndex
%
category: 'private'
method: AbstractContainer
do: aBlock

	container do: aBlock
%
category: 'private'
method: AbstractContainer
size

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

	^[:collection :subscript | 
		(subscript isKindOf: slice) ifTrue: [
			| start stop step return |
			start := (subscript start isKindOf: NoneType) ifTrue: [ 0 ] ifFalse: [ subscript start ___number ].
			stop := (subscript stop isKindOf: NoneType) ifTrue: [ collection size ] ifFalse: [ subscript stop ___number ].
			(stop > collection size) ifTrue: [ stop := collection size ].
			step := (subscript step isKindOf: NoneType) ifTrue: [ 1 ] ifFalse: [ subscript step ___number ].
			return := collection ___container class new.
			collection ___container from: start+1 to: stop doWithIndex: [ :item :i |
				(((i - start - 1) rem: step) = 0) ifTrue: [ return add: item ]
			].
			self class withAll: return.
		] ifFalse: [
			| index |
			index := subscript.
			[
				collection ___container at: index ___number
			] on: OffsetError do: [:ex | 
				ex resignalAs: (IndexError new details: 'list index out of range'; yourself).
			]
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
