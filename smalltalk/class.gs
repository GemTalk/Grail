! ------------------- Remove existing behavior from class
expectvalue /Metaclass3       
doit
class removeAllMethods.
class class removeAllMethods.
%
! ------------------- Class methods for class
set compile_env: 0
category: 'other'
classmethod: class
newForNode: aFunctionDefAst scope: aScope

	^self basicNew
		initializeNode: aFunctionDefAst scope: aScope;
		yourself
%
! ------------------- Instance methods for class
set compile_env: 0
category: 'other'
method: class
__mro__

	^ [ | linearization parentLinearizations parentList mergeLinearizations|
		linearization := Array with: self.
		parentLinearizations := self astNode bases collect: [ :base | (scope get: base id) __mro__ value ].
		parentList := self astNode bases collect: [ :base | (scope get: base id) ].		
		mergeLinearizations := Array withAll: parentLinearizations.
		mergeLinearizations add: parentList.
		linearization addAll: (self merge: mergeLinearizations).
		linearization.
	]
%
category: 'other'
method: class
astNode

	^ astNode
%
category: 'other'
method: class
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	| function |
	function := self get: aSymbol.
	^function
		callFromClass: self
		arguments: anArray
		keywords: aSymbolDictionary
		scope: aScope
%
category: 'other'
method: class
findGoodHead: linearizations

	| heads |
	heads := self getHeads: linearizations.
	1 to: heads size do: [ :i | | head tails |
		head := heads at: i.
		tails := self getTails: linearizations index: i.
		(self head: head notInTail: tails) ifTrue: [ ^ head ].
	].
	^ nil
%
category: 'other'
method: class
get: aSymbol

	(aSymbol = #'__mro__') ifTrue: [ ^ self __mro__ value ].
	^ scope get: aSymbol
%
category: 'other'
method: class
getHeads: linearizations

	^ linearizations collect: [ :linearization | linearization at: 1 ]
%
category: 'other'
method: class
getTails: linearizations index: i

	| tails |
	tails := Array new.
	1 to: linearizations size do: [ :j | 
		| linearization |
		linearization := linearizations at: j.
		((j ~~ i) and: [ linearization size > 1 ]) ifTrue: [ 
			tails add: (linearization copyFrom: 2 to: linearization size).
		].
	].
	^ tails
%
category: 'other'
method: class
head: head notInTail: tails

	1 to: tails size do: [ :i |
		| tail |
		tail := tails at: i.
		(tail includes: head) ifTrue: [ ^ false ] 
	].
	^ true
%
category: 'other'
method: class
initializeNode: aFunctionDefAst scope: aScope

	astNode := aFunctionDefAst.
	scope := aScope.
%
category: 'other'
method: class
merge: linearizations

	| merged remainingHeads goodHead |
	merged := Array new.
	remainingHeads := linearizations.
	goodHead := self findGoodHead: remainingHeads.
	[ goodHead isNil ] whileFalse: [ 
		merged add: goodHead.
		remainingHeads := self removeHead: goodHead from: remainingHeads.
		goodHead := self findGoodHead: remainingHeads.
	].
	^ merged
%
category: 'other'
method: class
printOn: aStream

	super printOn: aStream.
	aStream nextPut: $-.
	astNode printOn: aStream.
%
category: 'other'
method: class
removeHead: head from: linearizations

	| heads |
	heads := Array new.
	1 to: linearizations size do: [ :i | 
		| linearization |
		linearization := linearizations at: i.
		(((linearization at: 1) = head) and: [ linearization size > 1 ]) ifTrue: [ heads add: (linearization copyFrom: 2 to: linearization size) ].
		((linearization at: 1) ~~ head) ifTrue: [ heads add: linearization copy ].
	].
	^ heads
%
category: 'other'
method: class
set: aSymbol to: aValue

	scope set: aSymbol to: aValue
%
category: 'other'
method: class
value: arguments value: keywords value: aScope
	"A class is a callable object."

	^astNode
		value: arguments
		value: keywords
		value: scope copy
%
set compile_env: 0
category: 'Python'
method: class
__dict__

	self halt.
%
category: 'Python'
method: class
__module__

	self halt.
%
category: 'Python'
method: class
__str__
	"<class '__main__.MyClass'>"

	^astNode __str__
%
category: 'Python'
method: class
__weakref__

	self halt.
%
