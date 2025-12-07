! ------------------- Remove existing behavior from Variables
removeallmethods Variables
removeallclassmethods Variables
! ------------------- Class methods for Variables
category: 'other'
classmethod: Variables
new

	^self newWithParent: Builtins singleton
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
category: 'other'
method: Variables
associationAt: aKey

| assoc |
assoc := dict associationAt: aKey otherwise: nil.
assoc == nil ifTrue: [
	dict at: aKey put: nil.
	assoc := dict associationAt: aKey.
].
^assoc
%
category: 'other'
method: Variables
at: aKey
	"Checks for a local variable read before write error and then checks the current scope
	and all previous scopes for the variable in questions."

	self isGlobals ifFalse: [
		(helperSymbols includes: aKey) ifTrue: [
			UnboundLocalError signal: 'UnboundLocalError: local variable ''' , aKey asString , ''' referenced before assignment'.
		]
	].

	^self find: aKey
%
category: 'other'
method: Variables
at: aKey put: aValue

| anAssoc |
helperSymbols remove: aKey ifAbsent: [].
(dict _validatePrivilegeOld: (dict at: aKey otherwise: nil) new: aValue) ifTrue: [
  anAssoc:= dict associationAt: aKey otherwise: nil.
  anAssoc == nil ifTrue: [
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

	^Variables newWithParent: self
%
category: 'other'
method: Variables
dict

^dict
%
category: 'other'
method: Variables
find: aKey
	"locates a variable in the current dictionary or if it isn't present searches its parent for it"

	parent ifNil: [^dict at: aKey ifAbsent: [NameError signal: 'NameError: name ''' , aKey asString , ''' is not defined']].
	^dict at: aKey ifAbsent: [parent find: aKey]
%
category: 'other'
method: Variables
findNonlocal: aKey
	"to do"
	self isGlobals ifTrue: [SyntaxError signal: 'SyntaxError: no binding for nonlocal ', aKey asString,' found'].
	dict at: aKey ifAbsent: [^parent findNonlocal: aKey].
	^self
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
setAsGlobals: aArray
	"create a global variable for each key in the array by creating a new variable in
	PyGlobals if one doesn't already exist by the name aKey and then adding the
	association from PyGlobals to this Variables"

	aArray do: [:aKey |
		dict at: aKey ifAbsent: [
				helperSymbols remove: aKey ifAbsent: [].
				dict add: (self globals associationAt: aKey).
				^nil
			].
		SyntaxError signal: ('SyntaxError: name ''' , aKey asString , ''' is assigned to before global declaration').
	]
%
category: 'other'
method: Variables
setAsNonlocals: aArray
	"create a global variable for each key in the array by creating a new variable in
	PyGlobals if one doesn't already exist by the name aKey and then adding the
	association from PyGlobals to this Variables"
	"	"

	aArray do: [:aKey |
		dict at: aKey ifAbsent: [
				helperSymbols remove: aKey ifAbsent: [].
				dict add: ((self findNonlocal: aKey) associationAt: aKey).
				^nil
			].
		SyntaxError signal: ('SyntaxError: name ''' , aKey asString , ''' is assigned to before nonlocal declaration').
	]
%
category: 'other'
method: Variables
setHelperSymbols: aIdentitySet

	helperSymbols := aIdentitySet.
%
