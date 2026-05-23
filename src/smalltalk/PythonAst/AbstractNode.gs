! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ===============================================================================
! AST Node Class Definitions and Method Imports
! ===============================================================================
! This file defines all AST node classes used by the Grail Python parser
! and then imports their method implementations.
! ===============================================================================

! ------------------- Class definition for AbstractNode
expectvalue /Class
doit
Object subclass: 'AbstractNode'
  instVarNames: #( parent)
  classVars: #( escapeCharacters)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AbstractNode comment:
'https://docs.python.org/3/library/ast.html#ast.AST

This is the base of all AST node classes. The actual node classes are
derived from the Parser/Python.asdl file. They are defined in the _ast C
module and re-exported in ast.

There is one class defined for each left-hand side symbol in the abstract
grammar (for example, ast.stmt or ast.expr). In addition, there is one class
defined for each constructor on the right-hand side; these classes inherit
from the classes for the left-hand side trees.

Hierarchy:
Object
  AbstractNode
'
%

expectvalue /Class
doit
AbstractNode category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AbstractNode
removeallmethods AbstractNode
removeallclassmethods AbstractNode

set compile_env: 0

category: 'Grail-parser construction'
classmethod: AbstractNode
buildWithFields: aDictionary
	"Create an AST node from a dictionary of field name -> value mappings.
	Used by PythonParser to construct nodes."

	| node varNames |
	node := self basicNew.
	varNames := self allInstVarNames.
	aDictionary keysAndValuesDo: [:key :value |
		| index |
		index := varNames indexOf: key.
		index > 0 ifTrue: [node instVarAt: index put: value].
	].
	^node
%

category: 'Grail-other'
classmethod: AbstractNode
isAbstract

	^self == AbstractNode
%

category: 'Grail-other'
classmethod: AbstractNode
new

	self error: 'Use #buildWithFields: instead'.
%

category: 'Grail-accessors'
method: AbstractNode
parent

	^parent
%

category: 'Grail-other'
method: AbstractNode
allocateTemp

	^parent allocateTemp
%

category: 'Grail-initialization'
method: AbstractNode
declareVariable

	parent declareVariable.
%

category: 'Grail-initialization'
method: AbstractNode
declareVariable: aSymbol

	parent declareVariable: aSymbol.
%

category: 'Grail-initialization'
method: AbstractNode
declareInstanceVar: aSymbol
	"Propagate an instance-attribute write (`self.X = …` or
	`self.X: T = …`) up the parent chain to the enclosing
	ClassDefAst, which collects them.  Default: forward.  Stops
	at the root (parent is nil)."

	parent ifNotNil: [parent declareInstanceVar: aSymbol]
%

category: 'Grail-other'
method: AbstractNode
globals

	^self module globals
%

category: 'Grail-testing'
method: AbstractNode
isInClass

	^parent isInClass
%

category: 'Grail-testing'
method: AbstractNode
isNone

	^false
%

category: 'Grail-initialization'
method: AbstractNode
isVariableIsDeclared: aSymbol
	"Walk up the parent chain looking for an enclosing scope (a BlockAst)
	that declares aSymbol as a local. Returns false if we reach the root
	without finding a declaration — i.e., aSymbol is a free name (resolved
	via the symbol list / builtins at runtime).

	When the walk crosses a FunctionDefAst boundary (we are climbing out
	of a function into its surrounding scope), switch to the
	``FromMethod`` variant on BlockAst nodes so any enclosing class
	body is invisible — Python class scope doesn't propagate into
	method bodies."

	parent isNil ifTrue: [^false].
	((self isKindOf: FunctionDefAst) or: [self isKindOf: LambdaAst]) ifTrue: [
		^ parent isVariableIsDeclaredFromMethod: aSymbol
	].
	^parent isVariableIsDeclared: aSymbol
%

category: 'Grail-initialization'
method: AbstractNode
isVariableIsDeclaredFromMethod: aSymbol
	"Default propagation for the ``FromMethod`` walk — delegate to
	parent.  BlockAst overrides to skip class-body locals."

	parent isNil ifTrue: [^false].
	^ parent isVariableIsDeclaredFromMethod: aSymbol
%

category: 'Grail-other'
method: AbstractNode
locals

	^parent locals
%

category: 'Grail-other'
method: AbstractNode
module

	^parent module
%

category: 'Grail-initialization'
method: AbstractNode
setParent: aNode
	"Set parent and recursively set parent on all child AST nodes."

	parent := aNode.
	2 to: self class allInstVarNames size do: [:i |
		| val |
		val := self instVarAt: i.
		(val isKindOf: AbstractNode) ifTrue: [
			val setParent: self.
		].
		(val isKindOf: Array) ifTrue: [
			val do: [:each |
				(each isKindOf: AbstractNode) ifTrue: [
					each setParent: self.
				].
			].
		].
	].
%

category: 'Grail-other'
method: AbstractNode
printSmalltalkOn: aStream
	"Default backstop — every concrete AST node should override
	printSmalltalkOn:.  When a newly-parsed shape (e.g. async
	comprehensions, ``yield from``, ``@`` matmul) lands without
	an override, this default fires; quote the receiver's class
	name in the message so grep across src/smalltalk/PythonAst
	finds the file to add the override in without a debugger trip."

	self error:
		'AbstractNode is abstract; subclasses must implement printSmalltalkOn: -- offender = '
		, self class name asString.
%

category: 'Grail-other'
method: AbstractNode
printSmalltalkWithParenthesisOn: aStream

	aStream nextPut: $(.
	self printSmalltalkOn: aStream.
	aStream nextPut: $).

%

category: 'Grail-other'
method: AbstractNode
setBlock: aBlock
%

category: 'Grail-other'
method: AbstractNode
collectStoreNamesInto: aSet
	"Add to aSet the id (Symbol) of every name bound in the enclosing
	scope at or below self.  ``Bound'' means any of:
	  - NameAst with Store ctx (assignment / augmented-assign / for-
	    target / walrus / except-as / with-as)
	  - FunctionDefAst.name or ClassDefAst.name (the def/class
	    statement binds its name in the enclosing scope)
	  - ImportAst / ImportFromAst alias names (each `as`-name binds in
	    the enclosing scope)

	Recurses through all AST children.  Conservative scoping: descends
	into nested function / lambda / class bodies and comprehensions, so
	a nested scope's own assignment to a name matching an outer
	parameter marks the outer param as ``reassigned'' — a false
	positive that costs the method-arg optimization in that case but
	never produces wrong code."

	((self isKindOf: NameAst) and: [self ctx isStoreCtx]) ifTrue: [
		aSet add: self id asSymbol.
	].
	((self isKindOf: FunctionDefAst) or: [self isKindOf: ClassDefAst]) ifTrue: [
		aSet add: self name asSymbol.
	].
	((self isKindOf: ImportAst) or: [self isKindOf: ImportFromAst]) ifTrue: [
		self collectImportBindingsInto: aSet.
	].
	2 to: self class allInstVarNames size do: [:i |
		| val |
		val := self instVarAt: i.
		(val isKindOf: AbstractNode) ifTrue: [
			val collectStoreNamesInto: aSet.
		].
		(val isKindOf: Array) ifTrue: [
			val do: [:each |
				(each isKindOf: AbstractNode) ifTrue: [
					each collectStoreNamesInto: aSet.
				].
			].
		].
	].
%

category: 'Grail-other'
method: AbstractNode
collectImportBindingsInto: aSet
	"For ``import a as x, b'' / ``from m import a as x, b'' the
	enclosing-scope bindings are the alias's asName when present,
	otherwise the leading dotted component of name (``import a.b''
	binds ``a'').  Walks the receiver's `names` collection of
	AliasAst entries."

	| namesIdx aliases |
	namesIdx := self class allInstVarNames indexOf: #names.
	namesIdx = 0 ifTrue: [^ self].
	aliases := self instVarAt: namesIdx.
	aliases isNil ifTrue: [^ self].
	aliases do: [:alias |
		| nameIdx asNameIdx aliasName aliasAsName binding |
		nameIdx := alias class allInstVarNames indexOf: #name.
		asNameIdx := alias class allInstVarNames indexOf: #asName.
		aliasName := nameIdx > 0 ifTrue: [alias instVarAt: nameIdx] ifFalse: [nil].
		aliasAsName := asNameIdx > 0 ifTrue: [alias instVarAt: asNameIdx] ifFalse: [nil].
		binding := aliasAsName
			ifNil: [
				aliasName isNil ifTrue: [nil] ifFalse: [
					| dotIdx |
					dotIdx := aliasName indexOf: $..
					dotIdx = 0
						ifTrue: [aliasName]
						ifFalse: [aliasName copyFrom: 1 to: dotIdx - 1]]]
			ifNotNil: [aliasAsName].
		binding ifNotNil: [aSet add: binding asSymbol].
	].
%
