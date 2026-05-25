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
	"`self.X` inside a class method gets the instVar-read fast path,
	but only when the first parameter is literally `self` —
	conventionally an instance method.  When the method's first
	param is `cls` (e.g. `def __new__(cls, name):`), the first arg
	is the class object, NOT an instance, and `cls.X` should resolve
	through the normal attribute-load path so a class-level
	attribute (like ``Symbol.symbols`` in blinker._utilities) reaches
	the class-side accessor rather than chasing an instance instVar
	that doesn't exist."
	((value isKindOf: NameAst)
		and: [(CallAst isSelfReference: value id)
			and: [CallAst selfParameterName == #self]]) ifTrue: [
		"Phase B: ``self.attr'' inside an instance method is a Python
		attribute load.  The new model collapses all the old
		discriminators (classAttrNames / classInstVarNames /
		classFunctionNames) into a uniform two-step lookup that mirrors
		CPython's MRO walk:
		  (1) Probe the instance's dynamic-instVar storage — this is
		      the canonical home for any value the instance was bound
		      to (whether via ``self.attr = ...'', ``setattr(obj, ...)'',
		      or a class-level default migrated at class-init time).
		  (2) On absent (nil per the nil-as-absent convention), fall
		      through to ``self @env1:___pyAttrLoad___:'' which walks
		      the class method dict, wraps callables as BoundMethods,
		      handles class-level dunders, and raises AttributeError
		      on miss."
		aStream
			nextPutAll: '(self @env0:dynamicInstVarAt: #''';
			nextPutAll: attr;
			nextPutAll: ''' ifAbsent: [self @env1:___pyAttrLoad___: #''';
			nextPutAll: attr;
			nextPutAll: '''])'.
		^self
	].
	"Dispatch attribute load through the ___pyAttrLoad___: runtime
	helper.  It returns the value if `attr` is an instVar/property
	(class has an `attr:` setter), or a BoundMethod if `attr` names a
	regular method.  This is what makes `f = obj.method; f(...)` work
	in Python idioms without prematurely calling the 0-arg method."

	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env1:___pyAttrLoad___: #'''.
	aStream nextPutAll: attr.
	aStream nextPutAll: ''''.
%

category: 'Grail-other'
method: AttributeAst
setSuperInfo: aScope

	aScope superInfo at: #'type' put: aScope outer astNode
%
