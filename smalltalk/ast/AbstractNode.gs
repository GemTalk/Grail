! ------------------- Remove existing behavior from AbstractNode
removeallmethods AbstractNode
removeallclassmethods AbstractNode
! ------------------- Class methods for AbstractNode
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
! ------------------- Instance methods for AbstractNode
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
category: 'initialization'
method: AbstractNode
isVariableIsDeclared: aSymbol

	^parent isVariableIsDeclared: aSymbol
%
category: 'other'
method: AbstractNode
globals

	^self module globals
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
category: 'other'
method: AbstractNode
printSmalltalkOn: aStream

	self halt.
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
