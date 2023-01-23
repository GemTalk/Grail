! ------------------- Remove existing behavior from Variables
removeAllMethods Variables
removeAllClassMethods Variables
! ------------------- Class methods for Variables
set compile_env: 0
category: 'other'
classmethod: Variables
new

	^self newWithParent: (Builtins singleton).
%
category: 'other'
classmethod: Variables
newWithParent: aVariables

	^super new 
		initialize;
		parent: aVariables;
		yourself.
%
! ------------------- Instance methods for Variables
set compile_env: 0
category: 'other'
method: Variables
associationAt: aKey otherwise: anObject

| assoc |
assoc := dict associationAt: aKey otherwise: nil .
assoc == nil ifTrue:[ 
	parent ifNil: [ ^dict associationAt: aKey otherwise: anObject ].
	^parent associationAt: aKey otherwise: anObject
].
^ assoc
%
category: 'other'
method: Variables
at: aKey

	(helperSymbols includes: aKey)
		ifTrue: [self error: 'read before write error']
		ifFalse: [^self at: aKey ifAbsent:[self error]].
%
category: 'other'
method: Variables
at: aKey ifAbsent: aBlock

	parent ifNil: [ ^dict at: aKey ifAbsent: aBlock ].
	^dict at: aKey ifAbsent: [ parent at: aKey ifAbsent: aBlock ]
%
category: 'other'
method: Variables
at: aKey put: aValue

| anAssoc |
helperSymbols remove: aKey ifAbsent: [].
(dict _validatePrivilegeOld: (dict at: aKey otherwise: nil) new: aValue) ifTrue:[
  anAssoc:= dict associationAt: aKey otherwise: nil .
  anAssoc == nil ifTrue:[
       dict _at: aKey put:
       (SymbolAssociation newWithKey: aKey value: aValue).
       ^aValue
  ].

  anAssoc value: aValue.
  ^aValue
].
%
category: 'other'
method: Variables
builtins

	^parent builtins
%
category: 'other'
method: Variables
createChildScope

	^self class newWithParent: self.
%
category: 'other'
method: Variables
globals

	^parent globals
%
category: 'other'
method: Variables
initialize

	helperSymbols := IdentitySet new.
	dict := SymbolDictionary new.
	super initialize.
%
category: 'other'
method: Variables
isBuiltins

	^false
%
category: 'other'
method: Variables
isGlobals

	^false
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
category: 'other'
method: Variables
setHelperSymbols: aIdentitySet

	helperSymbols := aIdentitySet.
%
