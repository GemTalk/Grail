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
new

	^self basicNew
		initialize;
		yourself
%
category: 'other'
classmethod: AbstractContainer
withAll: aCollection

	^self basicNew
		initialize: aCollection;
		yourself
%
! ------------------- Instance methods for AbstractContainer
set compile_env: 0
category: 'other'
method: AbstractContainer
= anObject

	^((anObject isKindOf: AbstractContainer) and: [container = anObject.container]) or: [container = anObject]
%
category: 'other'
method: AbstractContainer
add: anAssociation

	^container add: anAssociation
%
category: 'other'
method: AbstractContainer
at: anIndex

	^container at: ((anIndex isKindOf: int) ifTrue: [anIndex.number] ifFalse: [anIndex])
%
category: 'other'
method: AbstractContainer
at: aKey ifAbsent: aBlock

	^container at: aKey ifAbsent: aBlock
%
category: 'other'
method: AbstractContainer
at: aKey ifAbsentPut: aBlock

	^container at: aKey ifAbsentPut: aBlock
%
category: 'other'
method: AbstractContainer
at: anIndex put: aCharacter

	^container at: anIndex put: aCharacter.
%
category: 'other'
method: AbstractContainer
containerClass

	^self class containerClass
%
category: 'other'
method: AbstractContainer
do: aBlock

	^container do: aBlock.
%
category: 'other'
method: AbstractContainer
hash

	^container hash
%
category: 'other'
method: AbstractContainer
initialize

	container := self containerClass new.
%
category: 'other'
method: AbstractContainer
initialize: aCollection

	container := self containerClass withAll: aCollection.
%
category: 'other'
method: AbstractContainer
is_

	^ [ :anObject | container == anObject.container ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'other'
method: AbstractContainer
is_not

	^ [ :anObject | container ~~ anObject.container ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'other'
method: AbstractContainer
membershipIncludes: anObject

	^container includes: anObject
%
category: 'other'
method: AbstractContainer
postCopy

	container := container copy.
%
category: 'other'
method: AbstractContainer
size

	^container size
%
