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
AbstractNode category: 'Parser'
%

! ------------------- Remove existing behavior from AbstractNode
removeallmethods AbstractNode
removeallclassmethods AbstractNode

set compile_env: 0

category: 'parser construction'
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

category: 'other'
classmethod: AbstractNode
isAbstract

	^self == AbstractNode
%

category: 'other'
classmethod: AbstractNode
new

	self error: 'Use #buildWithFields: instead'.
%

category: 'other'
method: AbstractNode
allocateTemp

	^parent allocateTemp
%

category: 'initialization'
method: AbstractNode
declareVariable

	parent declareVariable.
%

category: 'initialization'
method: AbstractNode
declareVariable: aSymbol

	parent declareVariable: aSymbol.
%

category: 'other'
method: AbstractNode
globals

	^self module globals
%

category: 'testing'
method: AbstractNode
isInClass

	^parent isInClass
%

category: 'testing'
method: AbstractNode
isNone

	^false
%

category: 'initialization'
method: AbstractNode
isVariableIsDeclared: aSymbol

	^parent isVariableIsDeclared: aSymbol
%

category: 'other'
method: AbstractNode
locals

	^parent locals
%

category: 'other'
method: AbstractNode
module

	^parent module
%

category: 'initialization'
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

category: 'other'
method: AbstractNode
printSmalltalkOn: aStream

	self error: 'AbstractNode is abstract; subclasses must implement printSmalltalkOn:'.
%

category: 'other'
method: AbstractNode
printSmalltalkWithParenthesisOn: aStream

	aStream nextPut: $(.
	self printSmalltalkOn: aStream.
	aStream nextPut: $).

%

category: 'other'
method: AbstractNode
setBlock: aBlock
%
