! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AttributeAst
expectvalue /Class
doit
ExpressionAst subclass: 'AttributeAst'
  instVarNames: #( value attr ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AttributeAst comment:
'https://docs.python.org/3/library/ast.html#ast.Attribute

Attribute access, e.g. d.keys.

value is a node, typically a Name.
attr is a bare string giving the name of the attribute.
ctx is Load, Store or Del according to how the attribute is acted on.

Example:
>>> print(ast.dump(ast.parse(''snake.colour'', mode=''eval''), indent=4))
Expression(
    body=Attribute(
        value=Name(id=''snake'', ctx=Load()),
        attr=''colour'',
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        AttributeAst(value attr ctx)
'
%

expectvalue /Class
doit
AttributeAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AttributeAst
removeallmethods AttributeAst
removeallclassmethods AttributeAst

set compile_env: 0

category: 'Grail-accessing'
method: AttributeAst
attr

	^attr
%

category: 'Grail-accessing'
method: AttributeAst
value

	^value
%

category: 'Grail-other'
method: AttributeAst
assertContextIsLoad

	ctx assertIsLoad.
%

category: 'Grail-other'
method: AttributeAst
declareVariable

	value declareVariable.
%

category: 'Grail-other'
method: AttributeAst
id

	^attr
%

category: 'Grail-other'
method: AttributeAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: value id;
		nextPut: $.;
		nextPutAll: attr;
		nextPut: $);
		yourself.
%

category: 'Grail-other'
method: AttributeAst
printSmalltalkOn: aStream
	"When in class method context and value is the self parameter, emit
	an AttributeError-checked instVar read so an unset attribute raises
	a Python-shaped error instead of silently flowing nil downstream.
	(Phase C-3 — paired with Phase C-2 for unbound locals.)

	Otherwise emit ``(value) attr`` so dispatch goes through the regular
	Smalltalk message-send path; if attr is missing on a non-class-method
	receiver, the env-1 DNU backstop converts the resulting nil into a
	Python error if it reaches a message send."

	self assertContextIsLoad.
	((value isKindOf: NameAst) and: [CallAst isSelfReference: value id]) ifTrue: [
		aStream
			nextPutAll: '(AttributeError @env0:___checkAttr: ';
			nextPutAll: attr;
			nextPutAll: ' ofObject: self named: #';
			nextPutAll: attr;
			nextPutAll: ')'.
		^self
	].
	value printSmalltalkWithParenthesisOn: aStream.
	aStream space; nextPutAll: attr.
%

category: 'Grail-other'
method: AttributeAst
setSuperInfo: aScope

	aScope superInfo at: #'type' put: aScope outer astNode
%
