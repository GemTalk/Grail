! ------------------- Remove existing behavior from ClassDefAst
removeAllMethods ClassDefAst
removeAllClassMethods ClassDefAst
! ------------------- Class methods for ClassDefAst
! ------------------- Instance methods for ClassDefAst
set compile_env: 0
category: 'other'
method: ClassDefAst
__eq__

	^ [ :lhs :rhs | (lhs name = rhs name) ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'other'
method: ClassDefAst
__mro__

	^ [ :scope | 
		| linearization parentLinearizations parentList mergeLinearizations |
		linearization := Array with: (scope get: self name).
		parentLinearizations := self bases collect: [ :base | (scope get: base id) __mro__ value ].
		parentList := self bases collect: [ :base | (scope get: base id) ].		
		mergeLinearizations := Array withAll: parentLinearizations.
		mergeLinearizations add: parentList.
		linearization addAll: (Linearization merge: mergeLinearizations).
		linearization.
	]
%
category: 'other'
method: ClassDefAst
__str__
	"<class '__main__.MyClass'>"

	^[:inst | 
		str withAll: ((WriteStream on: Unicode7 new)
			nextPutAll: '<class ''';
			nextPutAll: self module name;
			nextPut: $.;
			nextPutAll: name;
			nextPutAll: '''>';
			contents)]
%
category: 'other'
method: ClassDefAst
astNode

	^ self
%
category: 'other'
method: ClassDefAst
bases 

	^ bases
%
category: 'other'
method: ClassDefAst
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
method: ClassDefAst
classAst

	^self
%
category: 'other'
method: ClassDefAst
evaluate: aScope

	| innerScope newClass |
	innerScope := aScope innerForNode: self.
	newClass := class newForNode: self scope: innerScope.
	aScope  set: name  to: newClass.
	body evaluate: innerScope.

%
category: 'other'
method: ClassDefAst
get: aSymbol

	self halt.
%
category: 'other'
method: ClassDefAst
initialize
	"ClassDef(identifier name, expr* bases, 
		keyword* keywords, stmt* body, expr* decorator_list)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := (stream upTo: $') asSymbol.
	self commaSpace.
	bases := self collectAst: [self expression].
	(bases size = 0) ifTrue: [ bases add: (NameAst with: #'object') ].
	self commaSpace.
	keywords := self collectAst: [KeywordAst parent: self].
	self commaSpace.
	BlockAst parent: self.	"calls back to set body"
	self commaSpace.
	decorator_list := self collectAst:[self expression].
	self readPosition.
%
category: 'other'
method: ClassDefAst
isDerivedFrom: aClass scope: aScope
"distinct from isSubclassOf: because
1) isDerivedFrom: checks the Python class hierarchy
2) isSubclassOf: checks the Smalltalk class hierarchy"
	
	(aClass name = name) ifTrue: [ ^ true ].
	bases do: [ :base | ((aScope get: base id) astNode isDerivedFrom: aClass scope: aScope) ifTrue: [ ^ true ] ].
	^ false
%
category: 'other'
method: ClassDefAst
isInClass

	^true
%
category: 'other'
method: ClassDefAst
name

	^name
%
category: 'other'
method: ClassDefAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		nextPut: $);
		yourself.
%
category: 'other'
method: ClassDefAst
setBlock: aBlockAst

	body := aBlockAst.
%
category: 'other'
method: ClassDefAst
value: posArgs value: keywordArgs value: aScope
	"args are the parameters while arguments are the values"

	| obj result |
	obj := Instance new: aScope copy.
	((obj has: #'__init__') == True) ifTrue: [ 
		result := obj
			call: #'__init__'
			withArguments: posArgs
			keywords: keywordArgs
			scope: aScope.
	] ifFalse: [
		result := None
	].
	result == None ifFalse: [TypeError signal: '__init__() should return None, not ?'].
	^obj
%
