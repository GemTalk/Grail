! ------- Create dictionary if it is not present
run
| aSymbol names userProfile |
aSymbol := #'PythonGlobals'.
userProfile := System myUserProfile.
names := userProfile symbolList names.
(names includes: aSymbol) ifFalse: [
	| symbolDictionary |
	symbolDictionary := SymbolDictionary new name: aSymbol; yourself.
	userProfile insertDictionary: symbolDictionary at: names size + 1.
].
%
! ------------------- Class definition for Builtins
expectvalue /Class
doit
Object subclass: 'Builtins'
  instVarNames: #()
  classVars: #()
  classInstVars: #( current default)
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
Builtins category: 'Parser'
%
! ------------------- Class definition for PyAstNode
expectvalue /Class
doit
Object subclass: 'PyAstNode'
  instVarNames: #( parent line column)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyAstNode comment:
'No class-specific documentation for PyAstNode, hierarchy is:
Object
  PyAstNode
'
%
expectvalue /Class
doit
PyAstNode category: 'Parser'
%
! ------------------- Class definition for PyAlias
expectvalue /Class
doit
PyAstNode subclass: 'PyAlias'
  instVarNames: #( name asName)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyAlias comment:
'No class-specific documentation for PyAlias, hierarchy is:
Object
  PyAstNode
    PyAlias( name asName)
'
%
expectvalue /Class
doit
PyAlias category: 'Parser'
%
! ------------------- Class definition for PyComparisonOperator
expectvalue /Class
doit
PyAstNode subclass: 'PyComparisonOperator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyComparisonOperator comment:
'No class-specific documentation for PyComparisonOperator, hierarchy is:
Object
  PyAstNode( line column)
    PyComparisonOperator
'
%
expectvalue /Class
doit
PyComparisonOperator category: 'Parser'
%
! ------------------- Class definition for PyEq
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyEq'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyEq category: 'Parser'
%
! ------------------- Class definition for PyGt
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyGt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyGt category: 'Parser'
%
! ------------------- Class definition for PyGtE
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyGtE'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyGtE category: 'Parser'
%
! ------------------- Class definition for PyIn
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyIn'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIn category: 'Parser'
%
! ------------------- Class definition for PyIs
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyIs'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIs category: 'Parser'
%
! ------------------- Class definition for PyIsNot
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyIsNot'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIsNot category: 'Parser'
%
! ------------------- Class definition for PyLt
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyLt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyLt category: 'Parser'
%
! ------------------- Class definition for PyLtE
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyLtE'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyLtE category: 'Parser'
%
! ------------------- Class definition for PyNotEq
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyNotEq'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyNotEq category: 'Parser'
%
! ------------------- Class definition for PyNotIn
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyNotIn'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyNotIn category: 'Parser'
%
! ------------------- Class definition for PyExpression
expectvalue /Class
doit
PyAstNode subclass: 'PyExpression'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyExpression comment:
'No class-specific documentation for PyExpression, hierarchy is:
Object
  PyAstNode( line column)
    PyExpression
'
%
expectvalue /Class
doit
PyExpression category: 'Parser'
%
! ------------------- Class definition for PyAssignment
expectvalue /Class
doit
PyExpression subclass: 'PyAssignment'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyAssignment category: 'Parser'
%
! ------------------- Class definition for PyName
expectvalue /Class
doit
PyAssignment subclass: 'PyName'
  instVarNames: #( identifier context)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyName category: 'Parser'
%
! ------------------- Class definition for PyAttribute
expectvalue /Class
doit
PyExpression subclass: 'PyAttribute'
  instVarNames: #( value attribute context)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyAttribute category: 'Parser'
%
! ------------------- Class definition for PyCall
expectvalue /Class
doit
PyExpression subclass: 'PyCall'
  instVarNames: #( function arguments keywords)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyCall category: 'Parser'
%
! ------------------- Class definition for PyCompare
expectvalue /Class
doit
PyExpression subclass: 'PyCompare'
  instVarNames: #( left cmpopList comparatorList)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyCompare category: 'Parser'
%
! ------------------- Class definition for PyString
expectvalue /Class
doit
PyExpression subclass: 'PyString'
  instVarNames: #( string)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyString category: 'Parser'
%
! ------------------- Class definition for PyExpressionContext
expectvalue /Class
doit
PyAstNode subclass: 'PyExpressionContext'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyExpressionContext comment:
'No class-specific documentation for PyExpressionContext, hierarchy is:
Object
  PyAstNode( line column)
    PyExpressionContext
'
%
expectvalue /Class
doit
PyExpressionContext category: 'Parser'
%
! ------------------- Class definition for PyAugLoad
expectvalue /Class
doit
PyExpressionContext subclass: 'PyAugLoad'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyAugLoad category: 'Parser'
%
! ------------------- Class definition for PyAugStore
expectvalue /Class
doit
PyExpressionContext subclass: 'PyAugStore'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyAugStore category: 'Parser'
%
! ------------------- Class definition for PyDelete
expectvalue /Class
doit
PyExpressionContext subclass: 'PyDelete'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyDelete category: 'Parser'
%
! ------------------- Class definition for PyLoad
expectvalue /Class
doit
PyExpressionContext subclass: 'PyLoad'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyLoad category: 'Parser'
%
! ------------------- Class definition for PyParam
expectvalue /Class
doit
PyExpressionContext subclass: 'PyParam'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyParam category: 'Parser'
%
! ------------------- Class definition for PyStore
expectvalue /Class
doit
PyExpressionContext subclass: 'PyStore'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyStore category: 'Parser'
%
! ------------------- Class definition for PyModule
expectvalue /Class
doit
PyAstNode subclass: 'PyModule'
  instVarNames: #( globals name path
                    source statements stream)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyModule comment:
'A Module is a file containing PythonGlobals definitions and statements. When a file (''script'') is executed from the command line, (e.g., ''python myFile.py''), the module global variable `__name__` is set to ''__main__''. A Module can be imported into another module using the `Import` command, and the module global variable `__name__` is then the name of the file.

https://docs.python.org/3/tutorial/modules.html?highlight=module'
%
expectvalue /Class
doit
PyModule category: 'Parser'
%
! ------------------- Class definition for PyStatement
expectvalue /Class
doit
PyAstNode subclass: 'PyStatement'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyStatement comment:
'No class-specific documentation for PyStatement, hierarchy is:
Object
  PyAstNode( line column)
    PyStatement
'
%
expectvalue /Class
doit
PyStatement category: 'Parser'
%
! ------------------- Class definition for PyExpr
expectvalue /Class
doit
PyStatement subclass: 'PyExpr'
  instVarNames: #( expression)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyExpr category: 'Parser'
%
! ------------------- Class definition for PyIf
expectvalue /Class
doit
PyStatement subclass: 'PyIf'
  instVarNames: #( test trueCase falseCase)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIf comment:
'No class-specific documentation for PyIf, hierarchy is:
Object
  PyAstNode( line column)
    PyIf( test trueCase falseCase)
'
%
expectvalue /Class
doit
PyIf category: 'Parser'
%
! ------------------- Class definition for PyImport
expectvalue /Class
doit
PyStatement subclass: 'PyImport'
  instVarNames: #( aliases)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyImport comment:
'No class-specific documentation for PyImport, hierarchy is:
Object
  PyAstNode
    PyImport( aliases)
'
%
expectvalue /Class
doit
PyImport category: 'Parser'
%
! ------------------- Class definition for PySystem
expectvalue /Class
doit
Object subclass: 'PySystem'
  instVarNames: #( modules)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PySystem category: 'Parser'
%
! ------------------- Class definition for PyToken
expectvalue /Class
doit
Object subclass: 'PyToken'
  instVarNames: #( startLine startColumn stopLine
                    stopColumn name string)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyToken comment:
'No class-specific documentation for Token, hierarchy is:
Object
  Token( start stop name string)
'
%
expectvalue /Class
doit
PyToken category: 'Parser'
%

! ------------------- Remove existing behavior from Builtins
expectvalue /Metaclass3
doit
Builtins removeAllMethods.
Builtins class removeAllMethods.
%
! ------------------- Class methods for Builtins
set compile_env: 0
category: 'other'
classmethod: Builtins
current

	current ifNil: [current := self default].
	^current
%
category: 'other'
classmethod: Builtins
current: anObject

	current := anObject.
%
category: 'other'
classmethod: Builtins
default

	default ifNil: [default := self new].
	^default
%
! ------------------- Instance methods for Builtins
set compile_env: 0
category: 'other'
method: Builtins
__import__: name _: globals _: locals _: fromList _: level
	"(name, globals=None, locals=None, fromlist=(), level=0)"

	self halt.
%

! ------------------- Remove existing behavior from PyAstNode
expectvalue /Metaclass3
doit
PyAstNode removeAllMethods.
PyAstNode class removeAllMethods.
%
! ------------------- Class methods for PyAstNode
set compile_env: 0
category: 'other'
classmethod: PyAstNode
parent: aNode

	(aNode isKindOf: PyAstNode) ifFalse: [self error: 'Not a valid parent!'].
	^self basicNew
		initialize: aNode;
		yourself
%
! ------------------- Instance methods for PyAstNode
set compile_env: 0
category: 'builtins'
method: PyAstNode
globals

	^self module globals
%
set compile_env: 0
category: 'other'
method: PyAstNode
addMissingPositions

	| token |
	token := self stream peek.
	line ifNil: [token halt].
	[
		token line < line or: [token line == line and: [token column <= column]].
	] whileTrue: [
		token := self stream next; peek.
	].
%
category: 'other'
method: PyAstNode
commaSpace

	| stream |
	stream := self stream.
	(stream peekFor: $,) ifFalse: [self error].
	(stream peekFor: Character space) ifFalse: [self error].
%
category: 'other'
method: PyAstNode
error

	self error: 'Invalid ' , self class name , ' node: ' , (self stream next: 10) printString.
%
category: 'other'
method: PyAstNode
expression

	^PyExpression expressionFrom: self
%
category: 'other'
method: PyAstNode
expressions

	| list stream |
	stream := self stream.
	(stream peekFor: $[) ifFalse: [self error].
	list := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		list add: self expression.
	].
	^list
%
category: 'other'
method: PyAstNode
initialize

	self subclassResponsibility
%
category: 'other'
method: PyAstNode
initialize: aNode

	parent := aNode.
	self initialize.
%
category: 'other'
method: PyAstNode
module

	^parent module
%
category: 'other'
method: PyAstNode
readPosition

	| stream string |
	stream := self stream.
	(stream peekFor: $,) ifFalse: [self error].
	(string := stream upTo: $=) = ' lineno' ifFalse: [self error].
	line := (stream upTo: $,) asNumber.
	(string := stream upTo: $=) = ' col_offset' ifFalse: [self error].
	column := (stream upTo: $)) asNumber.
%
category: 'other'
method: PyAstNode
stream

	^parent stream
%
category: 'other'
method: PyAstNode
string

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	^stream upTo: $'.
%
category: 'other'
method: PyAstNode
strings

	| list stream |
	stream := self stream.
	(stream peekFor: $[) ifFalse: [self error].
	list := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		list add: self string.
	].
	^list
%
category: 'other'
method: PyAstNode
suite

	| stream suite |
	stream := self stream.
	(stream peekFor: $[) ifFalse: [self error].
	suite := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		suite add: (PyStatement statementFrom: self).
		(stream peekFor: $,) ifTrue: [stream peekFor: Character space].
	].
	^suite
%
category: 'other'
method: PyAstNode
sys

	^parent sys
%

! ------------------- Remove existing behavior from PyAlias
expectvalue /Metaclass3
doit
PyAlias removeAllMethods.
PyAlias class removeAllMethods.
%
! ------------------- Class methods for PyAlias
! ------------------- Instance methods for PyAlias
set compile_env: 0
category: 'other'
method: PyAlias
addMissingPositions

	| token |
	token := self stream next.
	line := token line.
	column := token column.
%
category: 'other'
method: PyAlias
asName

	^asName
%
category: 'other'
method: PyAlias
initialize
	"alias = (identifier name, identifier? asname)"

	| stream |
	stream := self stream.
	name := self string.
	(stream peekFor: $,) ifFalse: [self error].
	stream skipSeparators.
	(stream peekFor: $') ifTrue: [
		asName := stream upTo: $'.
		(stream peekFor: $)) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $).
		string = 'None' ifFalse: [self error].
	].
%
category: 'other'
method: PyAlias
name

	^name
%

! ------------------- Remove existing behavior from PyComparisonOperator
expectvalue /Metaclass3
doit
PyComparisonOperator removeAllMethods.
PyComparisonOperator class removeAllMethods.
%
! ------------------- Class methods for PyComparisonOperator
set compile_env: 0
category: 'other'
classmethod: PyComparisonOperator
parent: aNode
	"cmpop = Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn"

	| stream string |
	stream := aNode stream.
	string := stream upTo: $(.
	(stream peekFor: $)) ifFalse: [self error].
	string = 'Eq'	ifTrue: [^PyEq basicNew initialize: aNode; yourself].
	self halt.
%
! ------------------- Instance methods for PyComparisonOperator
set compile_env: 0
category: 'other'
method: PyComparisonOperator
addMissingPositions

	| token |
	token := self stream next.
	line := token line.
	column := token column.
%
category: 'other'
method: PyComparisonOperator
initialize
	"override to do nothing!"
%

! ------------------- Remove existing behavior from PyEq
expectvalue /Metaclass3
doit
PyEq removeAllMethods.
PyEq class removeAllMethods.
%
! ------------------- Class methods for PyEq
! ------------------- Instance methods for PyEq

! ------------------- Remove existing behavior from PyGt
expectvalue /Metaclass3
doit
PyGt removeAllMethods.
PyGt class removeAllMethods.
%
! ------------------- Class methods for PyGt
! ------------------- Instance methods for PyGt

! ------------------- Remove existing behavior from PyGtE
expectvalue /Metaclass3
doit
PyGtE removeAllMethods.
PyGtE class removeAllMethods.
%
! ------------------- Class methods for PyGtE
! ------------------- Instance methods for PyGtE

! ------------------- Remove existing behavior from PyIn
expectvalue /Metaclass3
doit
PyIn removeAllMethods.
PyIn class removeAllMethods.
%
! ------------------- Class methods for PyIn
! ------------------- Instance methods for PyIn

! ------------------- Remove existing behavior from PyIs
expectvalue /Metaclass3
doit
PyIs removeAllMethods.
PyIs class removeAllMethods.
%
! ------------------- Class methods for PyIs
! ------------------- Instance methods for PyIs

! ------------------- Remove existing behavior from PyIsNot
expectvalue /Metaclass3
doit
PyIsNot removeAllMethods.
PyIsNot class removeAllMethods.
%
! ------------------- Class methods for PyIsNot
! ------------------- Instance methods for PyIsNot

! ------------------- Remove existing behavior from PyLt
expectvalue /Metaclass3
doit
PyLt removeAllMethods.
PyLt class removeAllMethods.
%
! ------------------- Class methods for PyLt
! ------------------- Instance methods for PyLt

! ------------------- Remove existing behavior from PyLtE
expectvalue /Metaclass3
doit
PyLtE removeAllMethods.
PyLtE class removeAllMethods.
%
! ------------------- Class methods for PyLtE
! ------------------- Instance methods for PyLtE

! ------------------- Remove existing behavior from PyNotEq
expectvalue /Metaclass3
doit
PyNotEq removeAllMethods.
PyNotEq class removeAllMethods.
%
! ------------------- Class methods for PyNotEq
! ------------------- Instance methods for PyNotEq

! ------------------- Remove existing behavior from PyNotIn
expectvalue /Metaclass3
doit
PyNotIn removeAllMethods.
PyNotIn class removeAllMethods.
%
! ------------------- Class methods for PyNotIn
! ------------------- Instance methods for PyNotIn

! ------------------- Remove existing behavior from PyExpression
expectvalue /Metaclass3
doit
PyExpression removeAllMethods.
PyExpression class removeAllMethods.
%
! ------------------- Class methods for PyExpression
set compile_env: 0
category: 'other'
classmethod: PyExpression
expressionFrom: aNode

	| string |
	string := aNode stream upTo: $(.
	string = 'Compare'	ifTrue: [^PyCompare	parent: aNode].
	string = 'Name'		ifTrue: [^PyName		parent: aNode].
	string = 'Str'			ifTrue: [^PyString		parent: aNode].
	string = 'Call'			ifTrue: [^PyCall			parent: aNode].
	string = 'Attribute'	ifTrue: [^PyAttribute	parent: aNode].
self halt.
%
! ------------------- Instance methods for PyExpression

! ------------------- Remove existing behavior from PyAssignment
expectvalue /Metaclass3
doit
PyAssignment removeAllMethods.
PyAssignment class removeAllMethods.
%
! ------------------- Class methods for PyAssignment
! ------------------- Instance methods for PyAssignment

! ------------------- Remove existing behavior from PyName
expectvalue /Metaclass3
doit
PyName removeAllMethods.
PyName class removeAllMethods.
%
! ------------------- Class methods for PyName
! ------------------- Instance methods for PyName
set compile_env: 0
category: 'other'
method: PyName
initialize
	"Name(identifier id, expr_context ctx)"

	identifier := self string.
	self commaSpace.
	context := PyExpressionContext parent: self.
	self readPosition.
%

! ------------------- Remove existing behavior from PyAttribute
expectvalue /Metaclass3
doit
PyAttribute removeAllMethods.
PyAttribute class removeAllMethods.
%
! ------------------- Class methods for PyAttribute
! ------------------- Instance methods for PyAttribute
set compile_env: 0
category: 'other'
method: PyAttribute
addMissingPositions

	value addMissingPositions.
%
category: 'other'
method: PyAttribute
initialize
	"Attribute(expr value, identifier attr, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	attribute := self string.
	self commaSpace.
	context := PyExpressionContext parent: self.
	self readPosition.
%

! ------------------- Remove existing behavior from PyCall
expectvalue /Metaclass3
doit
PyCall removeAllMethods.
PyCall class removeAllMethods.
%
! ------------------- Class methods for PyCall
! ------------------- Instance methods for PyCall
set compile_env: 0
category: 'other'
method: PyCall
addMissingPositions

	function addMissingPositions.
	arguments do: [:each | each addMissingPositions].
%
category: 'other'
method: PyCall
initialize
	"Call(expr func, expr* args, keyword* keywords)"

	function := self expression.
	self commaSpace.
	arguments := self expressions.
	self commaSpace.
	keywords := self strings.
	self readPosition.
%

! ------------------- Remove existing behavior from PyCompare
expectvalue /Metaclass3
doit
PyCompare removeAllMethods.
PyCompare class removeAllMethods.
%
! ------------------- Class methods for PyCompare
! ------------------- Instance methods for PyCompare
set compile_env: 0
category: 'other'
method: PyCompare
addMissingPositions

	super addMissingPositions.
	left addMissingPositions.
	cmpopList do: [:each | each addMissingPositions].
	comparatorList do: [:each | each addMissingPositions].
%
category: 'other'
method: PyCompare
initialize
	"Compare(expr left, cmpop* ops, expr* comparators)"

	| stream |
	stream := self stream.
	left := self expression.
	self commaSpace.
	(stream peekFor: $[) ifFalse: [self error].
	cmpopList := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		cmpopList add: (PyComparisonOperator parent: self).
	].
	self commaSpace.
	comparatorList := self expressions.
	self readPosition.
%

! ------------------- Remove existing behavior from PyString
expectvalue /Metaclass3
doit
PyString removeAllMethods.
PyString class removeAllMethods.
%
! ------------------- Class methods for PyString
! ------------------- Instance methods for PyString
set compile_env: 0
category: 'other'
method: PyString
initialize

	string := self string.
	self readPosition.
%

! ------------------- Remove existing behavior from PyExpressionContext
expectvalue /Metaclass3
doit
PyExpressionContext removeAllMethods.
PyExpressionContext class removeAllMethods.
%
! ------------------- Class methods for PyExpressionContext
set compile_env: 0
category: 'other'
classmethod: PyExpressionContext
parent: aNode

	| stream string |
	stream := aNode stream.
	string := stream upTo: $(.
	(stream peekFor: $)) ifFalse: [self error].
	string = 'Load'	ifTrue: [^PyLoad basicNew initialize: aNode; yourself].
self halt.
%
! ------------------- Instance methods for PyExpressionContext
set compile_env: 0
category: 'other'
method: PyExpressionContext
addMissingPositions

	| token |
	token := self stream next.
self halt.
%
category: 'other'
method: PyExpressionContext
initialize
	"override to do nothing!"
%

! ------------------- Remove existing behavior from PyAugLoad
expectvalue /Metaclass3
doit
PyAugLoad removeAllMethods.
PyAugLoad class removeAllMethods.
%
! ------------------- Class methods for PyAugLoad
! ------------------- Instance methods for PyAugLoad

! ------------------- Remove existing behavior from PyAugStore
expectvalue /Metaclass3
doit
PyAugStore removeAllMethods.
PyAugStore class removeAllMethods.
%
! ------------------- Class methods for PyAugStore
! ------------------- Instance methods for PyAugStore

! ------------------- Remove existing behavior from PyDelete
expectvalue /Metaclass3
doit
PyDelete removeAllMethods.
PyDelete class removeAllMethods.
%
! ------------------- Class methods for PyDelete
! ------------------- Instance methods for PyDelete

! ------------------- Remove existing behavior from PyLoad
expectvalue /Metaclass3
doit
PyLoad removeAllMethods.
PyLoad class removeAllMethods.
%
! ------------------- Class methods for PyLoad
! ------------------- Instance methods for PyLoad

! ------------------- Remove existing behavior from PyParam
expectvalue /Metaclass3
doit
PyParam removeAllMethods.
PyParam class removeAllMethods.
%
! ------------------- Class methods for PyParam
! ------------------- Instance methods for PyParam

! ------------------- Remove existing behavior from PyStore
expectvalue /Metaclass3
doit
PyStore removeAllMethods.
PyStore class removeAllMethods.
%
! ------------------- Class methods for PyStore
! ------------------- Instance methods for PyStore

! ------------------- Remove existing behavior from PyModule
expectvalue /Metaclass3
doit
PyModule removeAllMethods.
PyModule class removeAllMethods.
%
! ------------------- Class methods for PyModule
set compile_env: 0
category: 'other'
classmethod: PyModule
script: aString
"
PyModule script: '/Users/jfoster/code/performance/pyperformance'.
"
	^self new
		load: aString as: '__main__';
		initialize;
		yourself
%
! ------------------- Instance methods for PyModule
set compile_env: 0
category: 'other'
method: PyModule
addMissingPositions

	statements do: [:each | each addMissingPositions].
	stream := nil.
%
category: 'other'
method: PyModule
globals

self halt.
	^globals
%
category: 'other'
method: PyModule
initialize

	parent ifNil: [parent := PySystem new].
	statements do: [:each | each evaluate].
%
category: 'other'
method: PyModule
load: aPathString as: aNameString

	name := aNameString.
	path := aPathString.
	self
		parseAst;
		readTokens;
		addMissingPositions;
		readSource;
		yourself.
%
category: 'other'
method: PyModule
module

	^self
%
category: 'other'
method: PyModule
parseAst

	| string |
	stream := ReadStream on: self readAst.
	string := stream upTo: $(.
	string = 'Module' ifFalse: [self error].
	statements := self suite.
	(stream peekFor: $)) ifFalse: [self error].
	string := stream upToEnd trimSeparators.
	string isEmpty ifFalse: [self error: 'Unexpected text at end of AST: ' , string printString].
%
category: 'other'
method: PyModule
pythonPath

	^'/Library/Frameworks/PythonGlobals.framework/Versions/3.6/bin/python3'
%
category: 'other'
method: PyModule
readAst

	| string |
	string := '
import ast
file=open(''' , path , ''',''r'')
tree=ast.parse(file.read())
out=ast.dump(tree,annotate_fields=False,include_attributes=True)
file.close()
print(out)
'.
	^System performOnServer: 'echo "' , string , '" | ' , self pythonPath
%
category: 'other'
method: PyModule
readSource

	| file |
	file := GsFile openReadOnServer: path.
	source := file contentsAsUtf8.
	file close.
%
category: 'other'
method: PyModule
readTokens

	| tokens |
	tokens := System performOnServer: self pythonPath , ' -m tokenize -e ' , path.
	tokens := tokens subStrings: Character lf.
	tokens := tokens reject: [:each | each isEmpty].
	tokens := tokens collect: [:each | PyToken fromString: each].
	stream := ReadStream on: tokens.
%
category: 'other'
method: PyModule
stream

	^stream
%

! ------------------- Remove existing behavior from PyStatement
expectvalue /Metaclass3
doit
PyStatement removeAllMethods.
PyStatement class removeAllMethods.
%
! ------------------- Class methods for PyStatement
set compile_env: 0
category: 'other'
classmethod: PyStatement
statementFrom: aNode

	| string |
	string := aNode stream upTo: $(.
	string = 'Import' 	ifTrue: [^PyImport 	parent: aNode].
	string = 'If' 			ifTrue: [^PyIf 			parent: aNode].
	string = 'Expr'		ifTrue: [^PyExpr		parent: aNode].
	self halt.
%
! ------------------- Instance methods for PyStatement
set compile_env: 0
category: 'other'
method: PyStatement
evaluate

	self subclassResponsibility.
%

! ------------------- Remove existing behavior from PyExpr
expectvalue /Metaclass3
doit
PyExpr removeAllMethods.
PyExpr class removeAllMethods.
%
! ------------------- Class methods for PyExpr
! ------------------- Instance methods for PyExpr
set compile_env: 0
category: 'other'
method: PyExpr
addMissingPositions

	expression addMissingPositions.
%
category: 'other'
method: PyExpr
initialize

	expression := self expression.
	self readPosition.
%

! ------------------- Remove existing behavior from PyIf
expectvalue /Metaclass3
doit
PyIf removeAllMethods.
PyIf class removeAllMethods.
%
! ------------------- Class methods for PyIf
! ------------------- Instance methods for PyIf
set compile_env: 0
category: 'other'
method: PyIf
addMissingPositions

	super addMissingPositions.
	test addMissingPositions.
	trueCase do: [:each | each addMissingPositions].
	falseCase do: [:each | each addMissingPositions].
%
category: 'other'
method: PyIf
initialize
	"If(expr test, stmt* body, stmt* orelse)"

	test := self expression.
	self commaSpace.
	trueCase := self suite.
	self commaSpace.
	falseCase := self suite.
	self readPosition.
%

! ------------------- Remove existing behavior from PyImport
expectvalue /Metaclass3
doit
PyImport removeAllMethods.
PyImport class removeAllMethods.
%
! ------------------- Class methods for PyImport
! ------------------- Instance methods for PyImport
set compile_env: 0
category: 'other'
method: PyImport
addMissingPositions

	super addMissingPositions.
	aliases do: [:each | each addMissingPositions].
%
category: 'other'
method: PyImport
evaluate

	aliases do: [:each |
		| module |
		module := Builtins current
			__import__: each name
			_: self globals
			_: self locals
			_: #()
			_: 0.
		module halt.
	].
%
category: 'other'
method: PyImport
initialize

	| stream |
	stream := self stream.
	(stream peekFor: $[) ifFalse: [self error].
	aliases := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		| string |
		string := stream upTo: $(.
		string = 'alias' ifFalse: [self error].
		aliases add: (PyAlias parent: self).
	].
	self readPosition.
%

! ------------------- Remove existing behavior from PySystem
expectvalue /Metaclass3
doit
PySystem removeAllMethods.
PySystem class removeAllMethods.
%
! ------------------- Class methods for PySystem
set compile_env: 0
category: 'other'
classmethod: PySystem
new

	^self basicNew
		initialize;
		yourself
%
! ------------------- Instance methods for PySystem
set compile_env: 0
category: 'other'
method: PySystem
initialize

	modules := KeyValueDictionary new.
%
category: 'other'
method: PySystem
modules

	^modules
%
category: 'other'
method: PySystem
sys

	^self
%

! ------------------- Remove existing behavior from PyToken
expectvalue /Metaclass3
doit
PyToken removeAllMethods.
PyToken class removeAllMethods.
%
! ------------------- Class methods for PyToken
set compile_env: 0
category: 'other'
classmethod: PyToken
fromString: aString

	^self basicNew
		initialize: aString;
		yourself
%
! ------------------- Instance methods for PyToken
set compile_env: 0
category: 'other'
method: PyToken
column

	^startColumn
%
category: 'other'
method: PyToken
initialize: aString

	| pieces range temp |
	pieces := aString subStrings: $:.
	temp := pieces at: 1.
	pieces := (pieces at: 2) subStrings: $'.
	string := pieces at: 2.
	name := (pieces at: 1) trimSeparators.
	temp := temp subStrings: $-.
	range := (temp at: 1) subStrings: $,.
	startLine := (range at: 1) asNumber.
	startColumn := (range at: 2) asNumber.
	range := (temp at: 2) subStrings: $,.
	stopLine := (range at: 1) asNumber.
	stopColumn := (range at: 2) asNumber.
%
category: 'other'
method: PyToken
line

	^startLine
%
category: 'other'
method: PyToken
printOn: aStream

	aStream
		print: startLine;
		nextPut: $,;
		print: startColumn;
		nextPut: $-;
		print: stopLine;
		nextPut: $,;
		print: stopColumn;
		nextPutAll: ': ';
		nextPutAll: name;
		nextPutAll: ' - ';
		print: string;
		yourself.
%
