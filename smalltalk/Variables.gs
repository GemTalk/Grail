! ------------------- Remove existing behavior from Variables
removeAllMethods Variables
removeAllClassMethods Variables
! ------------------- Class methods for Variables
set compile_env: 0
category: 'other'
classmethod: Variables
new

	^super new.
%
category: 'other'
classmethod: Variables
newWithParent: aVariables

	^super new parent: aVariables; yourself.
%
! ------------------- Instance methods for Variables
set compile_env: 0
category: 'other'
method: Variables
associationAt: aKey otherwise: anObject

| assoc |
assoc := super associationAt: aKey otherwise: nil .
assoc == nil ifTrue:[ 
	parent ifNil: [ ^super associationAt: aKey otherwise: anObject ].
	^parent associationAt: aKey otherwise: anObject
].
^ assoc _value
%
category: 'other'
method: Variables
at: aKey ifAbsent: aBlock

	parent ifNil: [ ^super at: aKey ifAbsent: aBlock ].
	^super at: aKey ifAbsent: [ parent at: aKey ifAbsent: aBlock ]
%
category: 'other'
method: Variables
createChildScope

	^self class newWithParent: self.
%
category: 'other'
method: Variables
parent

	^parent
%
category: 'other'
method: Variables
parent: aVariables

	parent := aVariables
%
