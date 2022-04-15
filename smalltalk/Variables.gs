! ------------------- Remove existing behavior from Variables
removeAllMethods Variables
removeAllClassMethods Variables
! ------------------- Class methods for Variables
set compile_env: 0
category: 'other'
classmethod: Variables
new

	^super new initialize.
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
^ assoc
%
category: 'other'
method: Variables
at: aKey ifAbsent: aBlock

	parent ifNil: [ ^super at: aKey ifAbsent: aBlock ].
	^super at: aKey ifAbsent: [ parent at: aKey ifAbsent: aBlock ]
%
category: 'other'
method: Variables
at: aKey put: aValue

"If the receiver already contains a SymbolAssociation with the given key, this
 makes aValue the value of that SymbolAssociation.  Otherwise, this creates a
 new SymbolAssociation with the given key and value and adds it to the
 receiver.  aKey must be a Symbol.   Returns aValue."

| anAssoc |
(self _validatePrivilegeOld: (self at: aKey otherwise: nil) new: aValue) ifTrue:[
  anAssoc:= super associationAt: aKey otherwise: nil .
  anAssoc == nil ifTrue:[
       self _at: aKey put:
       (SymbolAssociation newWithKey: aKey value: aValue).
       ^aValue
  ].

  tableSize := tableSize.  "make sure SymbolDictionary is dirty, not just Association (#42383)"
  anAssoc value: aValue.
  ^aValue
].
%
category: 'other'
method: Variables
createChildScope

	^self class newWithParent: self.
%
category: 'other'
method: Variables
initialize

	builtins keysAndValuesDo: [ :key :value |
		self at: key put: value.
	].
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
