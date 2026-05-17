! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassDefAst
expectvalue /Class
doit
StatementAst subclass: 'ClassDefAst'
  instVarNames: #( name bases keywords
                    body decorator_list type_params)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ClassDefAst comment: 
'ClassDef(identifier name,
		 expr* bases,
		 keyword* keywords,
		 stmt* body,
		 expr* decorator_list,
		 type_param* type_params)'
%

expectvalue /Class
doit
ClassDefAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ClassDefAst
removeallmethods ClassDefAst
removeallclassmethods ClassDefAst

set compile_env: 0

category: 'Grail-code generation'
method: ClassDefAst
addVariableNamesTo: aStream

	aStream nextPutAll: name; space
%

category: 'Grail-code generation'
method: ClassDefAst
printSmalltalkOn: aStream
	"When compiling a module via loadModuleFromPath:, Python classes
	are created as real Smalltalk classes at load time. In the initialize
	method, just assign the class reference to the module instVar.

	The class reference is looked up from UserGlobals using the sanitized
	name ('pyc_ClassName'). This is set by loadModuleFromPath: before
	compiling the initialize method."

	(CallAst moduleClassBeingCompiled notNil) ifTrue: [
		| className |
		className := 'pyc_' , name.
		aStream
			nextPutAll: name;
			nextPutAll: ' := (UserGlobals @env0:at: #''';
			nextPutAll: className;
			nextPutAll: ''').'.
		^self
	].
	self printSmalltalkLegacyOn: aStream.
%

category: 'Grail-code generation'
method: ClassDefAst
printSmalltalkLegacyOn: aStream
	"Legacy dict-based class creation (for eval: context or when not in
	module compilation). Kept as fallback."

	aStream nextPutAll: name.
	aStream nextPutAll: ' := [:___cls___ |'; lf; increaseIndent.

	body variables notEmpty ifTrue: [
		aStream nextPut: $|.
		body variables do: [:each | aStream space; nextPutAll: each].
		aStream nextPutAll: ' |'; lf.
	].

	body body do: [:each |
		each printSmalltalkOn: aStream.
		aStream lf.
	].

	body variables do: [:each |
		aStream nextPutAll: '___cls___ @env0:at: #'''.
		aStream nextPutAll: each.
		aStream nextPutAll: ''' put: '.
		aStream nextPutAll: each.
		aStream nextPut: $.; lf.
	].

	aStream nextPutAll: '___cls___ @env0:at: #''__name__'' put: #'''.
	aStream nextPutAll: name.
	aStream nextPutAll: '''.'; lf.

	aStream nextPutAll: '___cls___'; lf.

	aStream decreaseIndent; nextPutAll: '] value: (PythonClass perform: #new env: 0).'.
%

category: 'Grail-accessing'
method: ClassDefAst
body

	^ body
%

category: 'Grail-Class Compilation'
method: ClassDefAst
instanceVarNamesFromInit
	"Scan __init__ body for `self.attr = ...` assignments to determine
	instance variable names for the generated Smalltalk class."

	| initMethod initBody selfName result |
	initMethod := body body detect: [:stmt |
		(stmt isKindOf: FunctionDefAst) and: [stmt name asSymbol == #'__init__']
	] ifNone: [^ #()].
	selfName := initMethod allParameterNames first.
	initBody := initMethod body.
	result := IdentitySet new.
	initBody body do: [:stmt |
		(stmt isKindOf: AssignAst) ifTrue: [
			| tgt |
			tgt := stmt target.
			((tgt isKindOf: AttributeAst) and: [
				(tgt value isKindOf: NameAst) and: [tgt value id = selfName]
			]) ifTrue: [
				result add: tgt attr asSymbol.
			].
		].
	].
	^ result asArray
%

category: 'Grail-Class Compilation'
method: ClassDefAst
instanceMethodDefs
	"Return all InstanceFunctionDefAst nodes from the class body."

	^ body body select: [:stmt | stmt isKindOf: InstanceFunctionDefAst]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
selfParameterName
	"Return the self parameter name from __init__ (or the first instance method).
	Conventionally 'self' but could be any name."

	| initMethod paramNames |
	initMethod := body body detect: [:stmt |
		(stmt isKindOf: InstanceFunctionDefAst)
	] ifNone: [^ #self].
	paramNames := initMethod allParameterNames.
	paramNames isEmpty ifTrue: [^ #self].
	^ paramNames first asSymbol
%

category: 'Grail-other'
method: ClassDefAst
__eq__

	^[:lhs :rhs | (lhs name = rhs name) ifTrue: [True] ifFalse: [False]]
%

category: 'Grail-other'
method: ClassDefAst
__mro__

	self error: 'What should thgis do?'.
"
	^[:scope |
		| linearization parentLinearizations parentList mergeLinearizations |
		linearization := Array with: (scope get: self name).
		parentLinearizations := self bases collect: [:base | (scope get: base id) __mro__ value].
		parentList := self bases collect: [:base | (scope get: base id)].
		mergeLinearizations := Array withAll: parentLinearizations.
		mergeLinearizations add: parentList.
		linearization addAll: (Linearization merge: mergeLinearizations).
		linearization.
	]
	"
%

category: 'Grail-other'
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

category: 'Grail-other'
method: ClassDefAst
astNode

	^self
%

category: 'Grail-other'
method: ClassDefAst
bases

	^bases
%

category: 'Grail-other'
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

category: 'Grail-other'
method: ClassDefAst
classAst

	^self
%

category: 'Grail-other'
method: ClassDefAst
get: aSymbol

	self halt.
%

category: 'Grail-other'
method: ClassDefAst
isDerivedFrom: aClass scope: aScope

"distinct from isSubclassOf: because
1) isDerivedFrom: checks the Python class hierarchy
2) isSubclassOf: checks the Smalltalk class hierarchy"

	(aClass name = name) ifTrue: [^true].
	bases do: [:base | ((aScope get: base id) astNode isDerivedFrom: aClass scope: aScope) ifTrue: [^true]].
	^false
%

category: 'Grail-other'
method: ClassDefAst
isInClass

	^true
%

category: 'Grail-other'
method: ClassDefAst
name

	^name
%

category: 'Grail-other'
method: ClassDefAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		nextPut: $);
		yourself.
%

category: 'Grail-other'
method: ClassDefAst
setBlock: aBlockAst

	body := aBlockAst.
%

category: 'Grail-other'
method: ClassDefAst
value: posArgs value: keywordArgs value: aScope
	"args are the parameters while arguments are the values"

	self error: 'What should this do?'.
	"| obj result |
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
	"
%
